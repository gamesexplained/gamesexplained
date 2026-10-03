// From ghidra-mcp-next, Apache-2.0; see README.md, LICENSE and NOTICE.
// Adapted: only the records, range index and helpers used by the exporter.
package com.xebyte.core;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;


import ghidra.program.model.address.Address;
import ghidra.program.model.address.AddressIterator;
import ghidra.program.model.address.AddressRange;
import ghidra.program.model.address.AddressSet;
import ghidra.program.model.address.AddressSetView;
import ghidra.program.model.listing.CodeUnit;
import ghidra.program.model.listing.CommentType;
import ghidra.program.model.listing.Data;
import ghidra.program.model.listing.DataIterator;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.InstructionIterator;
import ghidra.program.model.listing.Listing;
import ghidra.program.model.listing.Program;
import ghidra.program.model.mem.Memory;
import ghidra.program.model.symbol.Namespace;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceManager;
import ghidra.program.model.symbol.Symbol;
import ghidra.program.model.symbol.SymbolIterator;
import ghidra.program.model.symbol.SymbolTable;

public final class ListingRangeService {
    private static Address next(Address address) {
        try {
            return address.next();
        }
        catch (RuntimeException exception) {
            return null;
        }
    }

    private static Address cappedEnd(Address start, int maxLength, Address absoluteEnd) {
        if (maxLength < 1) {
            throw new IllegalArgumentException("Listing unit length must be positive.");
        }
        try {
            Address candidate = start.addNoWrap((long) maxLength - 1);
            return candidate.compareTo(absoluteEnd) < 0 ? candidate : absoluteEnd;
        }
        catch (Exception exception) {
            return absoluteEnd;
        }
    }

    private static String address(Address address) {
        return address.toString();
    }

    private static String namespace(Symbol symbol) {
        Namespace namespace = symbol.getParentNamespace();
        return namespace == null ? "" : namespace.getName(true);
    }

    record LabelRecord(
        Address address,
        String name,
        String namespace,
        String sourceType,
        boolean primary,
        boolean entryPoint) {
    }

    record CommentRecord(Address address, CommentType type, String text) {
    }

    record DataMetadata(String displayName, String pathName) {
    }

    record IncomingPage(
        List<Reference> included,
        boolean complete,
        Address nextAddress,
        long nextOffset) {
    }

    record UnitMetadata(
        List<LabelRecord> labels,
        List<CommentRecord> comments,
        List<Reference> outgoing,
        IncomingPage incoming) {
    }

    static final class RangeIndex {
        private final Memory memory;
        private final Address effectiveStart;
        private final Address effectiveEnd;
        private final AddressSetView initialized;
        private final Listing listing;
        private final SymbolTable symbols;
        private final ReferenceManager references;
        private final Peekable<Instruction> instructions;
        private final Peekable<Data> data;
        private final Peekable<Symbol> labels;
        private final Peekable<Address> commentAddresses;
        private final Peekable<Address> outgoingSources;
        private final Peekable<Address> incomingDestinations;

        private RangeIndex(
                Memory memory,
                Address effectiveStart,
                Address effectiveEnd,
                AddressSetView initialized,
                Listing listing,
                SymbolTable symbols,
                ReferenceManager references,
                InstructionIterator instructions,
                DataIterator data,
                SymbolIterator labels,
                AddressIterator commentAddresses,
                AddressIterator outgoingSources,
                AddressIterator incomingDestinations) {
            this.memory = memory;
            this.effectiveStart = effectiveStart;
            this.effectiveEnd = effectiveEnd;
            this.initialized = initialized;
            this.listing = listing;
            this.symbols = symbols;
            this.references = references;
            this.instructions = new Peekable<>(instructions);
            this.data = new Peekable<>(data);
            this.labels = new Peekable<>(labels);
            this.commentAddresses = new Peekable<>(commentAddresses);
            this.outgoingSources = new Peekable<>(outgoingSources);
            this.incomingDestinations = new Peekable<>(incomingDestinations);
        }

        static RangeIndex build(
                Program program, Address effectiveStart, Address effectiveEnd) {
            AddressSet range = new AddressSet(effectiveStart, effectiveEnd);
            Listing listing = program.getListing();
            Memory memory = program.getMemory();
            return new RangeIndex(
                memory, effectiveStart, effectiveEnd,
                memory.getAllInitializedAddressSet(),
                listing, program.getSymbolTable(), program.getReferenceManager(),
                listing.getInstructions(range, true),
                listing.getDefinedData(range, true),
                program.getSymbolTable().getSymbolIterator(effectiveStart, true),
                listing.getCommentAddressIterator(range, true),
                program.getReferenceManager()
                    .getReferenceSourceIterator(range, true),
                program.getReferenceManager()
                    .getReferenceDestinationIterator(range, true));
        }

        Memory memory() {
            return memory;
        }

        CodeUnit codeUnitAt(Address address) {
            discardCodeBefore(address);
            Instruction instruction = instructions.peek();
            Data definedData = data.peek();
            Address instructionAddress = codeUnitAddress(instruction);
            Address dataAddress = codeUnitAddress(definedData);
            if (address.equals(instructionAddress)
                    && (dataAddress == null
                        || instructionAddress.compareTo(dataAddress) <= 0)) {
                return instructions.take();
            }
            if (address.equals(dataAddress)) {
                return data.take();
            }
            return null;
        }

        boolean initialized(Address address) {
            return initialized.contains(address);
        }

        boolean initialized(Address start, Address end) {
            return initialized.contains(start, end);
        }

        Address undefinedEnd(Address start, int maxLength) {
            Address nextBoundary = nextBoundary(start);
            Address boundaryEnd = nextBoundary == null
                ? effectiveEnd : nextBoundary.previous();
            return cappedEnd(start, maxLength, boundaryEnd);
        }

        UnitMetadata collectMetadata(Address start, Address end, int incomingCap) {
            List<LabelRecord> collectedLabels = new ArrayList<>();
            List<CommentRecord> collectedComments = new ArrayList<>();
            List<Reference> collectedOutgoing = new ArrayList<>();
            List<Reference> collectedIncoming =
                new ArrayList<>(incomingCap + 1);
            Set<String> labelKeys = new HashSet<>();

            while (atOrBefore(symbolAddress(labels.peek()), end)) {
                Symbol symbol = labels.take();
                if (atOrAfter(symbolAddress(symbol), start)) {
                    addLabel(symbol, collectedLabels, labelKeys);
                }
            }

            while (atOrBefore(commentAddresses.peek(), end)) {
                Address at = commentAddresses.take();
                if (!atOrAfter(at, start)) {
                    continue;
                }
                for (CommentType type : CommentType.values()) {
                    String text = listing.getComment(type, at);
                    if (text != null) {
                        collectedComments.add(new CommentRecord(at, type, text));
                    }
                }
            }

            while (atOrBefore(outgoingSources.peek(), end)) {
                Address source = outgoingSources.take();
                if (!atOrAfter(source, start)) {
                    continue;
                }
                Reference[] at = references.getReferencesFrom(source);
                if (at != null) {
                    collectedOutgoing.addAll(Arrays.asList(at));
                }
            }

            while (atOrBefore(incomingDestinations.peek(), end)) {
                Address destination = incomingDestinations.take();
                if (!atOrAfter(destination, start)) {
                    continue;
                }
                addSymbolsAt(destination, collectedLabels, labelKeys);
                int remaining = incomingCap + 1 - collectedIncoming.size();
                if (remaining > 0) {
                    collectedIncoming.addAll(ReferenceOrdering.takeStored(
                        references.getReferencesTo(destination), remaining));
                }
            }

            collectedLabels.sort(Comparator
                .comparing(LabelRecord::address)
                .thenComparing(LabelRecord::namespace)
                .thenComparing(LabelRecord::name)
                .thenComparing(LabelRecord::sourceType)
                .thenComparing(LabelRecord::primary));
            collectedComments.sort(Comparator
                .comparing(CommentRecord::address)
                .thenComparing(comment -> comment.type().name())
                .thenComparing(CommentRecord::text));
            collectedOutgoing.sort(ReferenceOrdering.outgoing());

            IncomingPage incoming;
            if (collectedIncoming.size() <= incomingCap) {
                incoming = new IncomingPage(
                    List.copyOf(collectedIncoming), true, null, 0);
            }
            else {
                List<Reference> included =
                    List.copyOf(collectedIncoming.subList(0, incomingCap));
                Reference nextReference = collectedIncoming.get(incomingCap);
                long offset = included.stream()
                    .filter(reference -> reference.getToAddress().equals(
                        nextReference.getToAddress()))
                    .count();
                incoming = new IncomingPage(
                    included, false, nextReference.getToAddress(), offset);
            }
            return new UnitMetadata(
                List.copyOf(collectedLabels),
                List.copyOf(collectedComments),
                List.copyOf(collectedOutgoing),
                incoming);
        }

        private void addSymbolsAt(
                Address destination,
                List<LabelRecord> collected,
                Set<String> labelKeys) {
            Symbol[] at = symbols.getSymbols(destination);
            if (at == null) {
                return;
            }
            for (Symbol symbol : at) {
                addLabel(symbol, collected, labelKeys);
            }
        }

        private void addLabel(
                Symbol symbol,
                List<LabelRecord> collected,
                Set<String> labelKeys) {
            if (symbol == null || symbol.getAddress() == null) {
                return;
            }
            Address at = symbol.getAddress();
            LabelRecord label = new LabelRecord(
                at, symbol.getName(), namespace(symbol),
                ReferenceOrdering.sourceKind(symbol.getSource()),
                symbol.isPrimary(), symbols.isExternalEntryPoint(at));
            String key = String.join("\u001f",
                address(label.address()), label.namespace(), label.name(),
                label.sourceType(), Boolean.toString(label.primary()),
                Boolean.toString(label.entryPoint()));
            if (labelKeys.add(key)) {
                collected.add(label);
            }
        }

        private Address nextBoundary(Address start) {
            Address boundary = null;
            boundary = earlierAfter(boundary, codeUnitAddress(instructions.peek()), start);
            boundary = earlierAfter(boundary, codeUnitAddress(data.peek()), start);
            boundary = earlierAfter(boundary, symbolAddress(labels.peek()), start);
            boundary = earlierAfter(boundary, commentAddresses.peek(), start);
            boundary = earlierAfter(boundary, outgoingSources.peek(), start);
            boundary = earlierAfter(boundary, incomingDestinations.peek(), start);
            boundary = earlierAfter(
                boundary, initializationBoundaryAfter(start), start);
            return boundary;
        }

        private Address initializationBoundaryAfter(Address start) {
            if (initialized.contains(start)) {
                AddressRange range = initialized.getRangeContaining(start);
                if (range == null) {
                    return null;
                }
                Address after = next(range.getMaxAddress());
                return within(after) ? after : null;
            }
            Address nextInitialized = initialized.findFirstAddressInCommon(
                new AddressSet(start, effectiveEnd));
            return within(nextInitialized) ? nextInitialized : null;
        }

        private void discardCodeBefore(Address address) {
            while (before(codeUnitAddress(instructions.peek()), address)) {
                instructions.take();
            }
            while (before(codeUnitAddress(data.peek()), address)) {
                data.take();
            }
        }

        private boolean within(Address address) {
            return address != null
                && address.getAddressSpace().equals(
                    effectiveStart.getAddressSpace())
                && address.compareTo(effectiveStart) >= 0
                && address.compareTo(effectiveEnd) <= 0;
        }

        private static Address codeUnitAddress(CodeUnit unit) {
            return unit == null ? null : unit.getMinAddress();
        }

        private Address symbolAddress(Symbol symbol) {
            if (symbol == null || !within(symbol.getAddress())) {
                return null;
            }
            return symbol.getAddress();
        }

        private static boolean before(Address candidate, Address address) {
            return candidate != null && candidate.compareTo(address) < 0;
        }

        private static boolean atOrBefore(Address candidate, Address address) {
            return candidate != null && candidate.compareTo(address) <= 0;
        }

        private static boolean atOrAfter(Address candidate, Address address) {
            return candidate != null && candidate.compareTo(address) >= 0;
        }

        private static Address earlierAfter(
                Address current, Address candidate, Address start) {
            if (candidate == null || candidate.compareTo(start) <= 0) {
                return current;
            }
            return current == null || candidate.compareTo(current) < 0
                ? candidate : current;
        }
    }

    static final class Peekable<T> {
        private final Iterator<T> iterator;
        private T next;
        private boolean loaded;

        Peekable(Iterator<T> iterator) {
            this.iterator = iterator;
        }

        T peek() {
            if (!loaded) {
                next = null;
                while (iterator != null && iterator.hasNext() && next == null) {
                    next = iterator.next();
                }
                loaded = true;
            }
            return next;
        }

        T take() {
            T value = peek();
            next = null;
            loaded = false;
            return value;
        }
    }

}
