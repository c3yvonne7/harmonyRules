// MuseScore
// 
// Check Parts - check Soprano, Alto, Tennor, Bass 
//  for conformance to good harmony writing rules.

// Current feature list:
//
// Checks are based on pp. 5, 6 & 7 of the textbook, "First Year Harmony," by William Lovelock.
//    Note: This plugin does NOT check whether the leading note rises to tonic in the progression V-I (p.6, 11.f).
//    The other checks on these pages, 11.a to 11.e, 11.g, 12.a & 12.b are checked.
//
// Multi-voice checks:
//   Checks for parallel perfect 5ths and octaves, 
//    including consecutive 5ths and octaves in contrary motion,
//    and unison to octave and octave to unison.
//   (note: different intervals that are enharmonically equivalent
//    to a perfect 5th or octave are NOT detected).
//  Checks for exposed 5ths and octaves.  Note: an exposed 5th between II and V is allowed
//    by Lovelock's textbook, but this plugin will still mark it as a problem.  It is up to
//    the composer to recognize such exposed 5ths as being acceptable.
//
// Single voice checks:
//  The following errors are detected for each voice selected (or all voices if nothing was selected)
//    All augmented intervals between one note and the next
//    Diminished 5ths, when they are not followed by a note within the interval
//    Leaps of a diminished 4th and 7th (if you, unlike me, are not a novice composer, you may know how to use
//       these intervals correctly; use your discretion).
//    Leaps of a 6th are better avoided, but should be followed by a note within the interval
//    Octaves, when they are not preceeded and followed by a note within the interval
//    Leaps of a 7th, 9th or larger, even with one note intervening
//
//    Text is written to the score above any such intervals detected to notify the
//    user of their existence, and the notes themselves are changed to red colour.
//    Using the undo button will easily undo all changes.
//
// Assumptions made about the score:
//   Each voice should only have one note at a time (i.e. one note per museScore "chord").
//      if a voice contains a chord of two or more notes, it is annotated as an error on the score.
//      To check your chords properly, each voice should play only one note at a time, as only the
//      top note of each museScore chord in a single voice is checked.
//   If nothing is selected, the entire score is checked.
//   Any number of voices may be checked at once, but if there are more than four voices, consecutive
//      octaves may be more likely.
//   For the purposes of analysis for the MULTI-VOICE checks, if different voices contain simultaneous 
//      notes of different lengths,
//      the longer note(s) are treated as if they were split into shorter notes of the same length as the shortest
//      simultaneous note.  No notes on the score itself are changed (apart from the colour of the notes).
//   For the purposes of analysis for the SINGLE-VOICE checks, no notes are split.  Consecutive notes of the same
//      pitch ARE TREATED AS ONE NOTE for the analysis (the score itself is not changed).  I am only a novice composer.
//      If you think consecutive notes of the same pitch should not be treated as one, please 
//           email me at c3yvonne7@gmail.com
//      You can also change this yourself, by finding the calls to readNextNote (almost at the end of this file), 
//          similar to the following (lines 1144, 1152 & 1165):
//
//        readNextNote(curScore, voiceChkd[currVoiceChkd].cursor, selectionEnd, voiceChkd[currVoiceChkd].notes[curIdx],
//			upToTicks, voiceChkd[currVoiceChkd].staff, voiceChkd[currVoiceChkd].voice, true);
//
//      ... in the section that does the single voice checks, and changing "true" to "false."  You have to change 
//           it in all three places.
//          



// 
// Copyright (C) 2012 Yvonne Cliff
//
//
//  This program is free software; you can redistribute it and/or modify
//  it under the terms of the GNU General Public License version 2.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program; if not, write to the Free Software
//  Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
//

//
//    This is ECMAScript code (ECMA-262 aka "Java Script")
//