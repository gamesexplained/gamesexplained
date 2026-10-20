/* The part of libsndfile's interface that plus4emu's library calls, with nothing behind it.
 *
 * kit/c16/tools.py builds plus4emu's library against this header when the computer's compiler
 * cannot find libsndfile's own (kit/c16/INSTALL.md, "What you need first"). plus4emu calls
 * libsndfile for two things: a tape kept as a sound file (WAV and the like) and recording its
 * sound to a file. The kit's server records no sound, and a tape image in the C16's TAP format or
 * plus4emu's own does not touch libsndfile. Here every file fails to open, so a sound-file tape is
 * refused with plus4emu's error and everything else works as with the real library.
 *
 * The names and values are libsndfile's documented interface (libsndfile.github.io/libsndfile/api.html),
 * written out for the uses in plus4emu's src/tape.cpp and src/soundio.cpp at git 939e652.
 */
#ifndef KIT_C16_SNDFILE_STUB_H
#define KIT_C16_SNDFILE_STUB_H

#include <stdint.h>

#define KIT_C16_SNDFILE_STUB 1

typedef int64_t sf_count_t;
typedef struct SNDFILE_tag SNDFILE;

typedef struct SF_INFO {
  sf_count_t frames;
  int samplerate;
  int channels;
  int format;
  int sections;
  int seekable;
} SF_INFO;

enum {
  SF_FORMAT_WAV = 0x010000,
  SF_FORMAT_PCM_S8 = 0x0001, SF_FORMAT_PCM_16 = 0x0002, SF_FORMAT_PCM_24 = 0x0003,
  SF_FORMAT_PCM_32 = 0x0004, SF_FORMAT_PCM_U8 = 0x0005, SF_FORMAT_FLOAT = 0x0006,
  SF_FORMAT_DOUBLE = 0x0007, SF_FORMAT_ULAW = 0x0010, SF_FORMAT_ALAW = 0x0011,
  SF_FORMAT_IMA_ADPCM = 0x0012, SF_FORMAT_MS_ADPCM = 0x0013,
  SF_FORMAT_SUBMASK = 0x0000FFFF
};
enum { SF_FALSE = 0, SF_TRUE = 1 };
enum { SFM_READ = 0x10, SFM_WRITE = 0x20, SFM_RDWR = 0x30 };

static inline SNDFILE *sf_open(const char *path, int mode, SF_INFO *info)
{ (void) path; (void) mode; (void) info; return (SNDFILE *) 0; }
static inline SNDFILE *sf_open_fd(int fd, int mode, SF_INFO *info, int close_desc)
{ (void) fd; (void) mode; (void) info; (void) close_desc; return (SNDFILE *) 0; }
static inline int sf_close(SNDFILE *f) { (void) f; return 0; }
static inline sf_count_t sf_seek(SNDFILE *f, sf_count_t frames, int whence)
{ (void) f; (void) frames; (void) whence; return -1; }
static inline sf_count_t sf_readf_short(SNDFILE *f, short *buf, sf_count_t frames)
{ (void) f; (void) buf; (void) frames; return 0; }
static inline sf_count_t sf_writef_short(SNDFILE *f, const short *buf, sf_count_t frames)
{ (void) f; (void) buf; (void) frames; return 0; }

#endif
