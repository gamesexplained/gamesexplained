#!/bin/bash
# Build VICE with the MCP server from a vice-mcp source tree, GTK3 GUI, into an
# install tree the kit can point tools/vice-mcp at. macOS with Homebrew; the
# recipe is the project's own .woodpecker/build-macos.yaml with the optional
# audio, network and hardware-SID pieces left out.
#
#   kit/c64/build-vice-mcp.sh <source tree> <install dir>
#   ln -sfn <install dir> tools/vice-mcp
#
# Needs (brew install): autoconf automake bison pkg-config xa dos2unix gtk+3
# librsvg adwaita-icon-theme glew libmicrohttpd libpng giflib. See
# kit/c64/INSTALL.md, "A build from source", for what those are and why.
set -euo pipefail
SRC=${1:?source tree (the vice-mcp checkout)}
PREFIX=${2:?install dir}
export PATH="/opt/homebrew/opt/bison/bin:/opt/homebrew/bin:$PATH"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:/opt/homebrew/opt/libmicrohttpd/lib/pkgconfig"
cd "$SRC/vice"
rm -rf build-gui
rm -f src/config.h
find . -name config.status -exec rm -f {} +
./src/buildtools/genvicedate_h.sh
./autogen.sh
sleep 1 && find . -name aclocal.m4 -exec touch {} +
sleep 1 && find . -name configure -exec touch {} + && find . -name config.h.in -exec touch {} +
find . -name Makefile.in -exec touch {} +
bison -d -o src/monitor/mon_parse.c src/monitor/mon_parse.y
mkdir -p build-gui && cd build-gui
../configure --prefix="$PREFIX" \
  --enable-option-checking=fatal \
  --enable-gtk3ui --enable-mcp-server --enable-cpuhistory \
  --disable-ethernet --disable-midi --disable-parsid --disable-arch \
  --disable-pdf-docs --disable-html-docs --disable-openmp \
  --with-fastsid --with-resid --with-png --with-gif --disable-x64 \
  --without-flac --without-lame --without-mpg123 --without-portaudio --without-vorbis --without-libcurl \
  2>&1 | tail -5
make -j"$(sysctl -n hw.ncpu)" -s
make install-strip -s
# the MCP unit suite, against what was just built
make -s -C ../src/mcp/tests test TOP_BUILDDIR="$PWD" | tail -3
ls "$PREFIX/bin/x64sc" && echo "now: ln -sfn $PREFIX $(git -C "$SRC" rev-parse --show-toplevel 2>/dev/null || echo '<gamesexplained>')/tools/vice-mcp"
