// Export a complete legacy-format listing. Optional argument: output file in work/.
// @category GamesExplained
import com.xebyte.core.CompleteListingWriter;
import ghidra.app.script.GhidraScript;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;

public class ExportGhidraListing extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length > 1 || currentProgram == null) {
            throw new IllegalArgumentException("Open a program; optionally pass one output filename.");
        }
        var selection = currentSelection != null && !currentSelection.isEmpty()
            ? currentSelection : currentProgram.getMemory();
        var writer = new CompleteListingWriter(currentProgram, 120);
        var text = new StringWriter();
        writer.write(new PrintWriter(text), selection);
        String output = text.toString();
        String shortfall = writer.shortfall(output.lines());
        if (shortfall != null) throw new IllegalStateException(shortfall);
        Path destination = args.length == 1 ? Path.of(args[0])
            : askFile("Export listing into the game's work/ directory", "Save").toPath();
        Files.writeString(destination, output);
        println("Exported complete listing to " + destination);
    }
}
