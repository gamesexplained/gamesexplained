// Annotate a synthetic 6502 program, then use the bundled exporter.
// @category GamesExplained
import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.ByteDataType;
import ghidra.program.model.data.WordDataType;
import ghidra.program.model.listing.CommentType;

public class CreateImportFixture extends GhidraScript {
    @Override
    public void run() throws Exception {
        currentProgram.setName("synthetic-import-fixture");
        disassemble(toAddr(0x1000));
        createLabel(toAddr(0x1000), "entry", true);
        createLabel(toAddr(0x1001), "load_operand", true);
        createLabel(toAddr(0x100e), "counter", true);
        createLabel(toAddr(0x100f), "table", true);
        createData(toAddr(0x100e), ByteDataType.dataType);
        createData(toAddr(0x100f), WordDataType.dataType);
        var listing = currentProgram.getListing();
        listing.setComment(toAddr(0x1000), CommentType.PLATE, "Load the synthetic counter.");
        listing.setComment(toAddr(0x1000), CommentType.EOL, "Synthetic side comment.");
        listing.setComment(toAddr(0x100e), CommentType.REPEATABLE, "One-byte synthetic counter.");
        listing.setComment(toAddr(0x100f), CommentType.PLATE, "A two-byte synthetic value.");
        currentProgram.getMemory().createUninitializedBlock("scratch", toAddr(0x2000), 2, false);
        runScript("ExportGhidraListing.java", getScriptArgs());
    }
}
