// From ghidra-mcp-next, Apache-2.0; see README.md, LICENSE and NOTICE.
package com.xebyte.core;

import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.xebyte.core.ListingRangeService.CommentRecord;
import com.xebyte.core.ListingRangeService.LabelRecord;
import com.xebyte.core.ListingRangeService.RangeIndex;
import com.xebyte.core.ListingRangeService.UnitMetadata;

import ghidra.program.model.address.Address;
import ghidra.program.model.address.AddressRange;
import ghidra.program.model.address.AddressSetView;
import ghidra.program.model.data.DataType;
import ghidra.program.model.listing.CodeUnit;
import ghidra.program.model.listing.CodeUnitFormat;
import ghidra.program.model.listing.CodeUnitFormatOptions;
import ghidra.program.model.listing.CommentType;
import ghidra.program.model.listing.Data;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.Program;
import ghidra.program.model.listing.Variable;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceManager;
import ghidra.program.model.symbol.Symbol;
import ghidra.app.util.template.TemplateSimplifier;

/**
 * Renders a listing that never discards content.
 *
 * <p>Ghidra's {@code AsciiExporter} loses material four ways: {@code clip()} on
 * width-constrained fields, a hardcoded six-line ceiling on EOL comments, a hardcoded
 * twenty-one direct reference ceiling, and stack-variable widths its option list never
 * publishes. Measured on a real 6502 program, a whole-program Ascii export clipped 1164
 * lines and dropped 7 of the 28 references to one address behind an {@code XREF[21]} header
 * that misreported the total.
 *
 * <p>This writer has no clip step and no ceilings. Columns are minimum widths: a long
 * operand pushes the comment column right rather than being shortened. Authored newlines in
 * comments are emitted as-is and never re-flowed, so aligned tables and diagrams survive.
 * Only the machine-generated cross-reference list wraps.
 *
 * <p>Annotation gathering is delegated to {@link RangeIndex}, which is driven from
 * {@code getCommentAddressIterator}, {@code getReferenceSourceIterator} and
 * {@code getReferenceDestinationIterator}. Those enumerate every annotated address including
 * offcut positions inside a multi-byte instruction, which a naive walk over code-unit start
 * addresses would miss.
 */
public final class CompleteListingWriter {

    /** Bytes per emitted undefined-data line. */
    private static final int UNDEFINED_RUN_LIMIT = 16;

    /**
     * Per-unit incoming-reference budget handed to {@link RangeIndex#collectMetadata}, which
     * pre-sizes a list of this length. Chosen well above anything observed (28 on the real
     * program) while staying cheap to allocate for every code unit; when a unit does exceed
     * it, {@link #incomingReferences} refetches that unit without a limit rather than
     * dropping the tail.
     */
    private static final int INCOMING_BUDGET = 64;

    private static final String ADDRESS_INDENT = "                ";

    private final Program program;
    private final int xrefWrapColumn;
    private final CodeUnitFormat format;
    private final ReferenceManager references;

    private final Map<CommentType, Integer> collectedComments =
        new EnumMap<>(CommentType.class);
    private final Map<CommentType, Integer> emittedComments =
        new EnumMap<>(CommentType.class);
    /** Each range the walk was asked to cover, and the last address it actually reached. */
    private final Map<Address, Address> requiredCoverage = new java.util.LinkedHashMap<>();
    private final Map<Address, Address> coverageReached = new java.util.LinkedHashMap<>();

    /** Authored comment body lines that must appear in the artifact, with their multiplicity. */
    private final Map<String, Integer> expectedCommentLines = new java.util.LinkedHashMap<>();
    /** Reference tokens that must appear in the artifact, with their multiplicity. */
    private final Map<String, Integer> expectedReferenceTokens = new java.util.LinkedHashMap<>();

    private int collectedLabels;
    private int emittedLabels;
    private int collectedReferences;
    private int emittedReferences;
    private int codeUnits;

    public CompleteListingWriter(Program program, int xrefWrapColumn) {
        this.program = program;
        this.xrefWrapColumn = xrefWrapColumn;
        this.references = program.getReferenceManager();
        // The same options Ghidra's own exporter uses. ShowBlockName.NON_LOCAL is
        // load-bearing on programs with overlay spaces: an operand reaching into an overlay
        // must stay block-qualified. getDefaultOperandRepresentation would render a bare
        // address instead of the symbol, which is why operand_text is not reused here.
        // The simplifier must be non-null and disabled, exactly as Ghidra's exporter builds
        // it: CodeUnitFormatOptions.simplifyTemplate dereferences it unconditionally, so
        // passing null throws as soon as an operand resolves to a symbol — the common case,
        // and guaranteed for an operand reaching into an overlay.
        TemplateSimplifier simplifier = new TemplateSimplifier();
        simplifier.setEnabled(false);
        this.format = new CodeUnitFormat(new CodeUnitFormatOptions(
            CodeUnitFormatOptions.ShowBlockName.NON_LOCAL,
            CodeUnitFormatOptions.ShowNamespace.NON_LOCAL,
            null, true, true, true, true, true, true, true, simplifier));
    }

    /** Renders every range of {@code selection}, in address order. */
    public void write(PrintWriter out, AddressSetView selection) {
        writeHeader(out, selection);
        for (AddressRange range : selection) {
            writeRange(out, range.getMinAddress(), range.getMaxAddress());
        }
        writeSymbolIndex(out, selection);
    }

    private void writeHeader(PrintWriter out, AddressSetView selection) {
        out.println(";" + "=".repeat(78));
        out.println("; " + program.getName());
        out.println(";" + "-".repeat(78));
        out.println("; language:      " + program.getLanguageID());
        out.println("; compiler:      " + program.getCompilerSpec().getCompilerSpecID());
        out.println("; image base:    " + program.getImageBase());
        // Ghidra stores the literal string "unknown" when a hash was never computed;
        // printing that is noise, so the line is omitted instead.
        String sha256 = program.getExecutableSHA256();
        if (sha256 != null && !sha256.isBlank() && !"unknown".equals(sha256)) {
            out.println("; sha256:        " + sha256);
        }
        String md5 = program.getExecutableMD5();
        if (md5 != null && !md5.isBlank() && !"unknown".equals(md5)) {
            out.println("; md5:           " + md5);
        }
        // Deliberately no export timestamp: repeated exports of an unchanged program stay
        // byte-identical, so the artifact can be diffed between revisions.
        for (AddressRange range : selection) {
            out.println("; range:         " + range.getMinAddress()
                + " - " + range.getMaxAddress());
        }
        out.println(";" + "-".repeat(78));
        for (MemoryBlock block : program.getMemory().getBlocks()) {
            out.println("; block " + pad(block.getName(), 20)
                + block.getStart() + " - " + block.getEnd()
                + "  " + (block.isRead() ? "r" : "-")
                + (block.isWrite() ? "w" : "-")
                + (block.isExecute() ? "x" : "-")
                + (block.isInitialized() ? "  initialized" : "  uninitialized")
                + (block.isOverlay() ? "  overlay" : ""));
        }
        out.println(";" + "=".repeat(78));
        out.println();
    }

    private void writeRange(PrintWriter out, Address requestedStart, Address requestedEnd) {
        // Snap to whole code units. A requested bound landing inside a multi-byte instruction
        // would otherwise make codeUnitAt return null for an address that is really part of a
        // decoded instruction, and the walk would emit "undefined" over its bytes. A listing
        // view shows the containing unit, so this does too.
        Address rangeStart = containingBound(requestedStart, true);
        Address rangeEnd = containingBound(requestedEnd, false);
        requiredCoverage.put(rangeStart, rangeEnd);
        RangeIndex index = RangeIndex.build(program, rangeStart, rangeEnd);
        Address current = rangeStart;
        while (current != null && current.compareTo(rangeEnd) <= 0) {
            CodeUnit existing = index.codeUnitAt(current);
            Address unitEnd = existing != null
                ? existing.getMaxAddress()
                : index.undefinedEnd(current, UNDEFINED_RUN_LIMIT);
            if (unitEnd.compareTo(rangeEnd) > 0) {
                unitEnd = rangeEnd;
            }
            UnitMetadata metadata =
                index.collectMetadata(current, unitEnd, INCOMING_BUDGET);
            writeUnit(out, existing, current, unitEnd, metadata, index);
            codeUnits++;
            coverageReached.put(rangeStart, unitEnd);
            current = unitEnd.equals(rangeEnd) ? null : next(unitEnd);
        }
    }

    /**
     * The containing code unit's bound, or the address itself where nothing is defined.
     *
     * @param start true for the unit's first address, false for its last
     */
    private Address containingBound(Address requested, boolean start) {
        CodeUnit containing = program.getListing().getCodeUnitContaining(requested);
        if (containing == null) {
            return requested;
        }
        return start ? containing.getMinAddress() : containing.getMaxAddress();
    }

    private void writeUnit(PrintWriter out, CodeUnit existing, Address start, Address end,
            UnitMetadata metadata, RangeIndex index) {
        tally(metadata);

        writeComments(out, metadata, CommentType.PLATE, true, start);
        writeComments(out, metadata, CommentType.PRE, false, start);
        writeLabelsAndFunction(out, metadata, start);
        writeCrossReferences(out, start, end, metadata);

        writeCodeLine(out, existing, start, end, index, metadata);
        if (existing instanceof Data data) {
            writeDataComponents(out, data, 1);
        }

        writeComments(out, metadata, CommentType.POST, false, start);
        writeComments(out, metadata, CommentType.REPEATABLE, false, start);
    }

    private void writeComments(PrintWriter out, UnitMetadata metadata, CommentType type,
            boolean boxed, Address unitStart) {
        for (CommentRecord comment : metadata.comments()) {
            if (comment.type() != type) {
                continue;
            }
            // Offcut is relative to the unit start, not to the unit's other comments: a unit
            // whose only comment sits at an interior address is still offcut.
            boolean offcut = !comment.address().equals(unitStart);
            if (boxed) {
                out.println(ADDRESS_INDENT + ";" + "*".repeat(70));
            }
            for (String line : bodyLines(comment.text())) {
                String body =
                    (offcut ? "[offcut " + comment.address() + "] " : "") + line;
                out.println(rstrip(ADDRESS_INDENT + "; " + body));
            }
            if (boxed) {
                out.println(ADDRESS_INDENT + ";" + "*".repeat(70));
            }
            emittedComments.merge(type, 1, Integer::sum);
        }
    }

    private void writeLabelsAndFunction(PrintWriter out, UnitMetadata metadata,
            Address start) {
        for (LabelRecord label : metadata.labels()) {
            String qualified = "Global".equals(label.namespace())
                ? label.name()
                : label.namespace() + "::" + label.name();
            String suffix = label.primary() ? "" : "  ; secondary";
            String offcut = label.address().equals(start)
                ? "" : "  ; offcut at " + label.address();
            out.println(qualified + ":" + suffix + offcut);
            emittedLabels++;
        }

        Function function = program.getFunctionManager().getFunctionAt(start);
        if (function != null) {
            out.println(rstrip(
                ADDRESS_INDENT + "; function: " + function.getPrototypeString(true, true)));
            for (Variable parameter : function.getParameters()) {
                writeVariable(out, "param", parameter);
            }
            for (Variable local : function.getLocalVariables()) {
                writeVariable(out, "local", local);
            }
        }
    }

    private void writeVariable(PrintWriter out, String role, Variable variable) {
        String definition = ADDRESS_INDENT + ";   " + role + "  " + variableText(variable);
        String comment = variable.getComment();
        if (comment == null || rstrip(comment).isEmpty()) {
            out.println(rstrip(definition));
            return;
        }

        String firstPrefix = definition + "  ; ";
        // Keep continuation text in assembly comments and aligned with the first line.
        String continuation = ADDRESS_INDENT + ";"
            + " ".repeat(firstPrefix.length() - ADDRESS_INDENT.length() - 1);
        String[] lines = bodyLines(comment);
        for (int index = 0; index < lines.length; index++) {
            out.println(rstrip((index == 0 ? firstPrefix : continuation) + lines[index]));
        }
    }

    private String variableText(Variable variable) {
        // Full text: AsciiExporter clips these fields at 15/15/8 characters.
        DataType type = variable.getDataType();
        return variable.getName()
            + " : " + (type == null ? "?" : type.getDisplayName())
            + " @ " + variable.getVariableStorage();
    }

    private void writeCrossReferences(PrintWriter out, Address start, Address end,
            UnitMetadata metadata) {
        List<Reference> direct = new ArrayList<>();
        List<Reference> offcut = new ArrayList<>();
        for (Reference reference : incomingReferences(start, end)) {
            if (reference.getToAddress().equals(start)) {
                direct.add(reference);
            }
            else {
                offcut.add(reference);
            }
        }
        writeReferenceGroup(out, "XREF", direct);
        writeReferenceGroup(out, "XREF offcut", offcut);
        // Outgoing too: a listing that names only who points here still drops half the graph.
        // Already gathered by collectMetadata, so this costs nothing extra to emit.
        List<Reference> outgoing = new ArrayList<>(metadata.outgoing());
        outgoing.sort(Comparator
            .comparing((Reference reference) -> reference.getFromAddress())
            .thenComparing(Reference::getToAddress));
        collectedReferences += outgoing.size();
        expect(outgoing);
        writeReferenceGroup(out, "XREF from", outgoing);
    }

    /**
     * Every reference into {@code [start, end]}, with no ceiling. Ghidra's exporter stops at
     * twenty-one and reports that count as the total.
     */
    private List<Reference> incomingReferences(Address start, Address end) {
        List<Reference> collected = new ArrayList<>();
        Address at = start;
        while (at != null && at.compareTo(end) <= 0) {
            if (references.hasReferencesTo(at)) {
                for (Reference reference : references.getReferencesTo(at)) {
                    collected.add(reference);
                }
            }
            at = at.equals(end) ? null : next(at);
        }
        collected.sort(Comparator
            .comparing((Reference reference) -> reference.getToAddress())
            .thenComparing(Reference::getFromAddress));
        collectedReferences += collected.size();
        expect(collected);
        return collected;
    }

    /** Records the artifact tokens these references must produce. */
    private void expect(List<Reference> group) {
        for (Reference reference : group) {
            expectedReferenceTokens.merge(referenceToken(reference), 1, Integer::sum);
        }
    }

    private String referenceToken(Reference reference) {
        return reference.getFromAddress() + "(" + abbreviate(reference) + ")";
    }

    private void writeReferenceGroup(PrintWriter out, String heading,
            List<Reference> group) {
        if (group.isEmpty()) {
            return;
        }
        String label = ADDRESS_INDENT + "; " + heading + "[" + group.size() + "]: ";
        String continuation = " ".repeat(label.length());
        StringBuilder line = new StringBuilder(label);
        boolean first = true;
        for (Reference reference : group) {
            String item = referenceToken(reference);
            if (!first && line.length() + item.length() + 2 > xrefWrapColumn) {
                // Trailing comma before the break, so a wrapped list still reads as a list.
                out.println(line.append(",").toString());
                line = new StringBuilder(continuation);
            }
            else if (!first) {
                line.append(", ");
            }
            line.append(item);
            emittedReferences++;
            first = false;
        }
        out.println(line.toString());
    }

    private String abbreviate(Reference reference) {
        if (reference.getReferenceType().isCall()) {
            return "c";
        }
        if (reference.getReferenceType().isJump()) {
            return "j";
        }
        // Read-write must be tested before either half, or it reports as write-only and the
        // listing loses the distinction Ghidra's own export shows as (RW).
        boolean read = reference.getReferenceType().isRead();
        boolean write = reference.getReferenceType().isWrite();
        if (read && write) {
            return "RW";
        }
        if (write) {
            return "W";
        }
        if (read) {
            return "R";
        }
        return "*";
    }

    private void writeCodeLine(PrintWriter out, CodeUnit existing, Address start, Address end,
            RangeIndex index, UnitMetadata metadata) {
        StringBuilder line = new StringBuilder();
        line.append(pad(start.toString(), 16));
        line.append(pad(bytesText(existing, start, end, index), 26));

        if (existing instanceof Instruction instruction) {
            line.append(pad(instruction.getMnemonicString(), 10));
            line.append(operandText(instruction));
        }
        else if (existing instanceof Data data) {
            line.append(pad(data.getDataType().getDisplayName(), 10));
            line.append(valueText(data));
        }
        else {
            line.append(pad("??", 10));
            line.append(undefinedText(start, end, index));
        }

        List<String> eol = eolLines(metadata, start);
        if (eol.isEmpty()) {
            out.println(rstrip(line.toString()));
            return;
        }
        int commentColumn = Math.max(line.length() + 2, 58);
        out.println(rstrip(pad(line.toString(), commentColumn) + "; " + eol.get(0)));
        String continuation = " ".repeat(commentColumn) + "; ";
        for (int index2 = 1; index2 < eol.size(); index2++) {
            out.println(rstrip(continuation + eol.get(index2)));
        }
    }

    /**
     * Emits one line per component of a structure or array, recursing into nested ones.
     *
     * <p>A structure's own {@code getDefaultValueRepresentation()} is empty, so without this
     * the unit contributes a type name and no content at all: field names, component types and
     * component values are absent. This mirrors {@code ProgramTextWriter.processSubData},
     * including its {@code |_} prefix and three-space indent per level, so a reader used to
     * Ghidra's export recognises the shape.
     */
    private void writeDataComponents(PrintWriter out, Data data, int depth) {
        int components = data.getNumComponents();
        for (int index = 0; index < components; index++) {
            Data component = data.getComponent(index);
            if (component == null) {
                // Ghidra's exporter returns quietly here; the component count changed under
                // it. Dropping the remaining fields is exactly the silent loss this writer
                // exists to prevent, so fail the export instead.
                throw new IncompleteListingException("component " + index + " of "
                    + components + " at " + data.getMinAddress()
                    + " disappeared while rendering; the program changed mid-export");
            }
            if (!restatesTheParent(data, component)) {
                StringBuilder line = new StringBuilder();
                line.append(pad(" ".repeat(depth * 3) + "|_" + component.getMinAddress(), 16));
                line.append(pad(component.getFieldName(), 26));
                line.append(pad(component.getDataType().getDisplayName(), 10));
                line.append(valueText(component));
                out.println(rstrip(line.toString()));
            }

            writeDataComponents(out, component, depth + 1);
        }
    }

    /**
     * True when a component's line would carry nothing its parent's line does not already show.
     *
     * <p>An element of a scalar array is exactly that: its name is its index, and its value is a
     * byte the parent already prints in a byte column that is never clipped. On the real program
     * those were 13,800 of 16,928 component lines — over half the artifact restating bytes. A
     * named structure field is never redundant, because the name appears nowhere else, and an
     * element that is itself structured still needs its line as the header for the fields
     * underneath it.
     */
    private static boolean restatesTheParent(Data parent, Data component) {
        return parent.getDataType() instanceof ghidra.program.model.data.Array
            && component.getNumComponents() == 0;
    }

    /**
     * A data unit's value. Through {@link CodeUnitFormat}, not
     * {@code getDefaultValueRepresentation}: the latter renders a pointer or vector numerically
     * even where a symbol (including an overlay-qualified one) exists for its target. Falls
     * back for the units the format renders as nothing, such as a structure itself.
     */
    private String valueText(Data data) {
        String rendered = format.getOperandRepresentationString(data, 0);
        return rendered == null || rendered.isBlank()
            ? data.getDefaultValueRepresentation() : rendered;
    }

    /**
     * Every authored EOL line, in order. AsciiExporter stops after six.
     *
     * <p>EOL comments do not pass through {@link #writeComments}, so the offcut marker has to
     * be applied here too: without it an EOL comment attached to an interior address is
     * rendered as though the unit itself carried it.
     */
    private List<String> eolLines(UnitMetadata metadata, Address unitStart) {
        List<String> lines = new ArrayList<>();
        for (CommentRecord comment : metadata.comments()) {
            if (comment.type() != CommentType.EOL) {
                continue;
            }
            String prefix = comment.address().equals(unitStart)
                ? "" : "[offcut " + comment.address() + "] ";
            for (String line : bodyLines(comment.text())) {
                lines.add(prefix + line);
            }
            emittedComments.merge(CommentType.EOL, 1, Integer::sum);
        }
        return lines;
    }

    private String bytesText(CodeUnit existing, Address start, Address end,
            RangeIndex index) {
        if (!index.initialized(start, end)) {
            return "";
        }
        int length = (int) (end.subtract(start) + 1);
        byte[] bytes = new byte[length];
        int read;
        try {
            read = index.memory().getBytes(start, bytes);
        }
        catch (Exception e) {
            // Never swallow this. Returning an empty byte field would publish a listing
            // that is missing bytes while every completeness counter still agreed.
            throw new IncompleteListingException(
                "could not read bytes at " + start + ": "
                    + (e.getMessage() == null ? e.toString() : e.getMessage()));
        }
        if (read != length) {
            // A short read would otherwise be padded with the array's zero tail and emitted
            // as though those were real bytes.
            throw new IncompleteListingException("short read at " + start + ": got "
                + read + " of " + length + " bytes");
        }
        StringBuilder hex = new StringBuilder(length * 2);
        for (byte value : bytes) {
            hex.append(String.format("%02x", value));
        }
        // No clipping: a 32-byte data unit renders all 64 characters. AsciiExporter cuts
        // this column at 12.
        return hex.toString();
    }

    /**
     * Signals that the listing could not be rendered in full. The runner turns this into a
     * failed export, so nothing is published; the alternative is a file that looks complete.
     */
    static final class IncompleteListingException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        IncompleteListingException(String message) {
            super(message);
        }
    }

    private String undefinedText(Address start, Address end, RangeIndex index) {
        if (!index.initialized(start, end)) {
            return "?? uninitialized";
        }
        return "undefined";
    }

    private String operandText(Instruction instruction) {
        StringBuilder operands = new StringBuilder();
        for (int index = 0; index < instruction.getNumOperands(); index++) {
            if (index > 0) {
                operands.append(",");
            }
            operands.append(format.getOperandRepresentationString(instruction, index));
        }
        return operands.toString();
    }

    private void writeSymbolIndex(PrintWriter out, AddressSetView selection) {
        Set<String> entries = new LinkedHashSet<>();
        List<Symbol> symbols = new ArrayList<>();
        for (Symbol symbol : program.getSymbolTable().getAllSymbols(true)) {
            if (selection.contains(symbol.getAddress())) {
                symbols.add(symbol);
            }
        }
        symbols.sort(Comparator.comparing((Symbol symbol) -> symbol.getName())
            .thenComparing(symbol -> symbol.getAddress().toString()));
        out.println();
        out.println(";" + "=".repeat(78));
        out.println("; symbol index");
        out.println(";" + "=".repeat(78));
        for (Symbol symbol : symbols) {
            entries.add("; " + pad(symbol.getName(), 40) + symbol.getAddress());
        }
        for (String entry : entries) {
            out.println(entry);
        }
    }

    private void tally(UnitMetadata metadata) {
        collectedLabels += metadata.labels().size();
        for (CommentRecord comment : metadata.comments()) {
            collectedComments.merge(comment.type(), 1, Integer::sum);
            for (String line : bodyLines(comment.text())) {
                String body = rstrip(line);
                // isBlank() would misclassify C64 control bytes $1C-$1F as whitespace.
                if (!body.isEmpty()) {
                    expectedCommentLines.merge(body, 1, Integer::sum);
                }
            }
        }
    }

    /**
     * Authored comment text split into lines.
     *
     * <p>The terminators recognised here are exactly the ones {@code BufferedReader} recognises,
     * so a line this writer emits is a line the content audit reads back. A lone carriage
     * return inside a comment would otherwise end a line on readback only, and the audit would
     * report a loss that never happened; it would also corrupt the line it sits on.
     */
    private static String[] bodyLines(String text) {
        return text.split("\r\n|\r|\n", -1);
    }

    /**
     * Emit-side completeness check. Gathering is delegated to already-tested,
     * offcut-correct code, so the realistic remaining defect is a renderer that receives a
     * record and fails to write it. Comment kinds are counted per
     * {@link CommentType#values()}, so a kind added by a future Ghidra release is counted
     * rather than silently skipped.
     *
     * @param emittedLines the artifact's own lines, for the content check
     * @return a description of the shortfall, or null when everything collected was emitted
     */
    public String shortfall(java.util.stream.Stream<String> emittedLines) {
        for (CommentType type : CommentType.values()) {
            int collected = collectedComments.getOrDefault(type, 0);
            int emitted = emittedComments.getOrDefault(type, 0);
            if (collected != emitted) {
                return "emitted " + emitted + " of " + collected + " "
                    + type.name().toLowerCase() + " comments";
            }
        }
        if (collectedLabels != emittedLabels) {
            return "emitted " + emittedLabels + " of " + collectedLabels + " labels";
        }
        if (collectedReferences != emittedReferences) {
            return "emitted " + emittedReferences + " of " + collectedReferences
                + " references";
        }
        // Coverage, not just cardinality: without this, an unexpected next() failure ends the
        // walk early and every count still agrees, because uncollected records are also
        // uncounted.
        for (Map.Entry<Address, Address> required : requiredCoverage.entrySet()) {
            Address reached = coverageReached.get(required.getKey());
            if (reached == null || !reached.equals(required.getValue())) {
                return "range " + required.getKey() + " - " + required.getValue()
                    + " stopped at " + (reached == null ? "nothing" : reached);
            }
        }
        return missingContent(emittedLines);
    }

    /**
     * Looks for every authored comment body line and every reference in the artifact itself.
     *
     * <p>The counts above prove a record was handed to a renderer, not that its text reached the
     * file. A renderer that emits part of a body, a deleted call to the group writer, or a sink
     * that swallows a line all leave every count in agreement — a record is counted as emitted
     * the moment the renderer is entered.
     *
     * <p>Comment bodies are matched as line suffixes rather than by parsing the {@code "; "}
     * introducer out of a line: a data value such as {@code ds "a; b"} contains that sequence,
     * so parsing would pick the wrong offset on exactly the lines that are hardest to check by
     * eye. Candidates are bucketed by last character, which any line ending in a given body
     * shares, so the scan stays proportional to the artifact.
     *
     * @return a description of the first content that did not reach the output, or null
     */
    private String missingContent(java.util.stream.Stream<String> emittedLines) {
        Map<Character, List<String>> byLastCharacter = new java.util.HashMap<>();
        Map<String, Integer> tokens = new java.util.HashMap<>();
        boolean[] referenceContinuation = { false };
        emittedLines.forEach(raw -> {
            String line = rstrip(raw);
            if (line.isEmpty()) {
                referenceContinuation[0] = false;
                return;
            }
            byLastCharacter
                .computeIfAbsent(line.charAt(line.length() - 1), key -> new ArrayList<>())
                .add(line);

            String payload = null;
            if (line.startsWith(ADDRESS_INDENT + "; XREF")) {
                int headingEnd = line.indexOf("]: ");
                if (headingEnd >= 0) {
                    payload = line.substring(headingEnd + 3);
                }
            }
            else if (referenceContinuation[0]) {
                payload = line.stripLeading();
            }
            referenceContinuation[0] = payload != null && payload.endsWith(",");
            if (payload == null) {
                return;
            }
            if (payload.endsWith(",")) {
                payload = payload.substring(0, payload.length() - 1);
            }
            // Address text may itself contain spaces: Ghidra's synthetic external-entry-point
            // source renders as "Entry Point". Commas are the writer's actual token delimiter,
            // including on wrapped continuation lines, so preserve all other characters.
            for (String piece : payload.split(",\\s*")) {
                if (!piece.isEmpty()) {
                    tokens.merge(piece, 1, Integer::sum);
                }
            }
        });

        for (Map.Entry<String, Integer> expected : expectedCommentLines.entrySet()) {
            String body = expected.getKey();
            int found = 0;
            for (String line : byLastCharacter.getOrDefault(
                    body.charAt(body.length() - 1), List.of())) {
                if (line.endsWith(body)) {
                    found++;
                }
            }
            if (found < expected.getValue()) {
                return "comment body line reached the output " + found + " of "
                    + expected.getValue() + " times: \"" + body + "\"";
            }
        }
        for (Map.Entry<String, Integer> expected : expectedReferenceTokens.entrySet()) {
            int found = tokens.getOrDefault(expected.getKey(), 0);
            if (found < expected.getValue()) {
                return "reference " + expected.getKey() + " reached the output "
                    + found + " of " + expected.getValue() + " times";
            }
        }
        return null;
    }

    Map<String, Object> report() {
        Map<String, Object> comments = new java.util.LinkedHashMap<>();
        for (CommentType type : CommentType.values()) {
            comments.put(type.name().toLowerCase(),
                emittedComments.getOrDefault(type, 0));
        }
        return Map.of(
            "code_units", codeUnits,
            "labels", emittedLabels,
            "references", emittedReferences,
            "comments", comments);
    }

    private Address next(Address address) {
        try {
            return address.addNoWrap(1);
        }
        catch (Exception e) {
            return null;
        }
    }

    private static String pad(String value, int width) {
        // Minimum width, never a maximum: an oversized value pushes what follows right
        // instead of being clipped.
        if (value.length() >= width) {
            return value + " ";
        }
        return value + " ".repeat(width - value.length());
    }

    private static String rstrip(String value) {
        int end = value.length();
        while (end > 0 &&
                (value.charAt(end - 1) == ' ' || value.charAt(end - 1) == '\t')) {
            end--;
        }
        return value.substring(0, end);
    }
}
