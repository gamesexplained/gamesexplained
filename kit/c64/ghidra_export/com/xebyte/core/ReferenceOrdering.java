// From ghidra-mcp-next, Apache-2.0; see README.md, LICENSE and NOTICE.
package com.xebyte.core;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceIterator;
import ghidra.program.model.symbol.SourceType;

/**
 * Shared reference ordering and bounded iteration for listing and xref continuations.
 *
 * <p>Incoming references intentionally retain Ghidra's stored order. In Ghidra
 * 12.1.2, {@code ReferenceDBManager.getReferencesTo} delegates to
 * {@code RefList.getRefs}; {@code RefListV0} returns append order and
 * {@code BigRefListV0} iterates its monotonically increasing table keys. Thus a
 * fixed program modification has a stable stored order without an eager
 * collect-and-sort pass. Listing truncation preserves that order.</p>
 */
final class ReferenceOrdering {

    private static final Comparator<Reference> OUTGOING =
        Comparator.comparing((Reference reference) -> reference.getFromAddress())
            .thenComparing(reference -> reference.getToAddress())
            .thenComparing(reference -> reference.getReferenceType().getName())
            .thenComparingInt(Reference::getOperandIndex)
            .thenComparing(reference -> sourceKind(reference.getSource()));

    private ReferenceOrdering() {
    }

    static Comparator<Reference> outgoing() {
        return OUTGOING;
    }

    static List<Reference> takeStored(ReferenceIterator iterator, int limit) {
        if (limit <= 0 || iterator == null) {
            return List.of();
        }
        List<Reference> references =
            new ArrayList<>(Math.min(limit, 1024));
        while (references.size() < limit && iterator.hasNext()) {
            Reference reference = iterator.next();
            if (reference != null) {
                references.add(reference);
            }
        }
        return references;
    }

    static String sourceKind(SourceType source) {
        return source == null ? "" : source.name().toLowerCase(Locale.ROOT);
    }
}
