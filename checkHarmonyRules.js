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
//      If you think consecutive notes of the same pitch should not be treated as one, please email me at c3yvonne7@gmail.com
//      You can also change this yourself, by finding the calls to readNextNote (almost at the end of this file), similar to the
//          following (lines 1144, 1152 & 1165):
//
//        			readNextNote(curScore, voiceChkd[currVoiceChkd].cursor, selectionEnd, voiceChkd[currVoiceChkd].notes[curIdx],
//						upToTicks, voiceChkd[currVoiceChkd].staff, voiceChkd[currVoiceChkd].voice, true);
//
//      ... in the section that does the single voice checks, and changing "true" to "false."  You have to change it in all three places.
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

//---------------------------------------------------------
//    init
//    this function will be called on startup of
//    mscore
//---------------------------------------------------------
var moreNotesPerChord = new QColor(226,28,72);  // colour of top note of a chord with more than one note.
var perfectFifthsColor = new QColor(226,28,72); // colour of consecutive perfect fifths
var perfect8vaColor = new QColor(255,106,7);    // colour of consecutive octaves
var seventhAndLargerColor = new QColor(123,14,127);			// colour of intervals a 7th & larger
var errorColor = new QColor(255,106,100);			// colour of other errors
var numNotesSaved = 6;                          // for each voice, the number of notes held in memory at once.
var StartCheckNote = 1;

// The data structure used by this plugin to check various music harmony rules.
// totalVoicesChkd is the number of different voices containing chords in the selection.
// numNotesSaved is the number of notes per voice held in memory at once.
//
// for (var i = 0; i < totalVoicesChkd; i++)
// for (var j = 0; j < numNotesSaved; j++)
//
// voiceChkd[i] = new Object();
// voiceChkd[i].staff =                                // The staff where voice i can be found
// voiceChkd[i].voice =                                // The voice number in the staff where voice i can be found
// voiceChkd[i].cursor = new Cursor(curScore);         // A cursor pointing to the next note to read into the data structure for this voice
//                                                     //   This cursor is generally several notes ahead of the note currently being checked.
// voiceChkd[i].cursorCurNote = new Cursor(curScore);  // A cursor pointing to the note currently being checked in this voice.
//                                                     //   This cursor is used to write an error message above the note if an error is found.
// voiceChkd[i].notes = new Array();                   // An array to keep details of the currently read notes in this voice.
// voiceChkd[i].notes[j].isEnd                         // True if this note is past the beginning or end of the selection.
//                                                     //   If notes[j].isEnd is true, nothing else in the notes[j] array is valid.
// voiceChkd[i].notes[j].isRest                        // True if this note is not a chord (NOTE: if there is neither a rest nor a chord
//                                                     //   in the score at this point, notes[j].isRest is set to true).
// voiceChkd[i].notes[j].thisNoteTicks                 // Number of ticks for this note, rest, or absence of note or rest.  Consecutive rests
//                                                     //   are combined into one rest in this data structure (the score remains unchanged).
// voiceChkd[i].notes[j].leftoverTicks                 // Used for splitting notes into two or more shorter notes of equivalent length.
// voiceChkd[i].notes[j].origStartTick                 // When cursor was pointing to this note, the value cursor.tick();
// voiceChkd[i].notes[j].actualStartTick			   // The tick this note starts on. (Will be greater than origStartTick if the note has
//													   // been split.)
// voiceChkd[i].notes[j].note                          // Points to the note in the score (only valid if !.isEnd && !.isRest).
//                                                     //   If this note in this voice was a chord of more than one note, .note is the 
//                                                     /      topmost note from the chord in this voice.
 

function noteName(tpc)
{
	// tpc is the tonal pitch class of the note.
	// Return a number corresponding to the letter name of the note.
	// Ignores whether the note is natural, sharp or flat.
	// A= 0  B= 1  C= 2  D=3  E=4  F=5  G=6 
	var tmpTpc = (7 + tpc) % 7;
	switch(tmpTpc) {
		case 0:
			return 2; //  C of some description - e.g. natural, #, ##, b, bb.
			break;
		case 1:
			return 6; //  G of some description.
			break;
		case 2:
			return 3; //  D of some description. 
			break;
		case 3:
			return 0; //  A of some description.
			break;
		case 4:
			return 4; //  E of some description.
			break;
		case 5:
			return 1; //  B of some description.
			break;
		case 6:
			return 5; //  F of some description.
			break;
		}
};

function printNoteName(tpc)
{
	// Print the letter name of the note.  Does not print whether the note is sharp or flat.
	// tpc is the tonal pitch class of the note.
	// A= 0  B= 1  C= 2  D=3  E=4  F=5  G=6 
	var tmpTpc = (7 + tpc) % 7;
	switch(tmpTpc) {
		case 0:
			print ("  C ");
			break;
		case 1:
			print("  G ");
			break;
		case 2:
			print("  D "); 
			break;
		case 3:
			print("  A ");
			break;
		case 4:
			print("  E ");
			break;
		case 5:
			print("  B ");
			break;
		case 6:
			print("  F ");
			break;
		}
};

function init()
      {
		// print("test script init");
      };

// -------------------------- printNoteOrRest --------------------------------------------------
function printNoteOrRest(voiceChkd, i, j)
{
			print("voiceChkd[" + i + "].notes[" + j + "].isEnd = " +  voiceChkd[i].notes[j].isEnd + " .isRest = " +  voiceChkd[i].notes[j].isRest +
			"; .thisNoteTicks = " + voiceChkd[i].notes[j].thisNoteTicks + "; leftoverTicks = " + voiceChkd[i].notes[j].leftoverTicks 
			+ "; origStartTick = " + voiceChkd[i].notes[j].origStartTick + "; actualStartTick = " + voiceChkd[i].notes[j].actualStartTick 
			);
};

// --------------------------- isPerfectFifth(note1, note2) -----------------------------------
function isPerfectFifth(note1, note2)
{
	// Returns true if the interval between the two notes is a perfect fifth.
	// Enharmonically equivalent intervals that are not five note letter-names 
	// apart return false.
	return isInterval(7, 4, note1, note2);
};

// --------------------------- isPerfect8va(note1, note2) -----------------------------------
function isPerfect8va(note1, note2)
{
	// Returns true if the interval between the two notes is a perfect octave.
	// Enharmonically equivalent intervals that are not eight note letter-names 
	// apart return false.

	return isInterval(0, 0, note1, note2);
};

// ---------------------------- isWithinInterval(intervalNote1, intervalNote2, testNote) -------------
// See whether a note is within an interval.
function isWithinInterval(intervalNote1, intervalNote2, testNote)
{
	var lowNote = intervalNote1;
	var highNote = intervalNote2;
	if(lowNote.pitch > highNote.pitch)
	{
		lowNote = intervalNote2;
		highNote = intervalNote1;
	}
	if (testNote.pitch > lowNote.pitch && testNote.pitch < highNote.pitch)
	{
		return true;
	} else {
		return false;
	}
		
};

//----------------------------- isIntervalType(letterDiff, note1, note2) -----------------------
// See whether the letter names of the two notes are
// letterDiff letters apart; e.g. isIntervalType(4, note1, note2) checks for a fifth of some kind.
function isIntervalType(letterDiff, note1, note2)
{
	var nameDiff = 0;
	if(note1.pitch > note2.pitch)
	{
		nameDiff = (7 + noteName(note1.tpc) - noteName(note2.tpc)) % 7;
	} else {
		nameDiff = (7 + noteName(note2.tpc) - noteName(note1.tpc)) % 7;
	}
	if (nameDiff == letterDiff )
	{
		return true;
	} else {
		return false;
	}
};

// ---------------------------- isInterval(semitoneDiff, letterDiff, note1, note2) -------------
// See whether the given notes are semitoneDiff semitones apart, and whether the letter names are
// letterDiff letters apart; e.g. isInterval(7,4, note1, note2) checks for perfect fifths.
function isInterval(semitoneDiff, letterDiff, note1, note2)
{
	var toneDiff = 0;
	var nameDiff = 0;
	if(note1.pitch > note2.pitch)
	{
		toneDiff = (note1.pitch - note2.pitch)%12;
		nameDiff = (7 + noteName(note1.tpc) - noteName(note2.tpc)) % 7;
	} else {
		toneDiff = (note2.pitch - note1.pitch)%12;
		nameDiff = (7 + noteName(note2.tpc) - noteName(note1.tpc)) % 7;
	}
	// print("toneDiff = " + toneDiff);
	// print("nameDiff = " + nameDiff);
	if (toneDiff == semitoneDiff)
	{
		// print("noteNames: " + noteName(note1.tpc) + " " + noteName(note2.tpc));
		if (nameDiff == letterDiff )
		{
			return true;
		} else {
			return false;
		}
		
	} else {
		return false;
	}
};

function writeErrorToScore4Notes2Voices(curScore, voiceChkd, errorString, v1, v2, i, j, thisErrorColor)
{
		var myText = new Text(curScore);
		myText.yOffset = -4.00;
		myText.xOffset = 0.00;
		myText.text = errorString +"(s,v)=(" + 
						(voiceChkd[v1].staff+1)+","+(voiceChkd[v1].voice+1) + ")&(" +
						(voiceChkd[v2].staff+1)+","+(voiceChkd[v2].voice+1)+")";
		voiceChkd[v1].cursorCurNote.putStaffText(myText);
		voiceChkd[v1].notes[i].note.color = new QColor(thisErrorColor);
		voiceChkd[v1].notes[j].note.color = new QColor(thisErrorColor);
		voiceChkd[v2].notes[i].note.color = new QColor(thisErrorColor);
		voiceChkd[v2].notes[j].note.color = new QColor(thisErrorColor);
	
};
  
// --------------------------- checkParallelPerfect5thsAndOctaves -----------------------------
function checkParallelPerfect5thsAndOctaves(curScore, voiceChkd, totalVoicesChkd, i, j)
{
	// i & j are the indexes of the two chords to check in voiceChkd.
	// Typically, j = i+1, unless there is a "passing note" between i & j.
	// NOTE: Detection of passing notes is not yet implemented, so curently j = i+1 when
	// this function is called.

	// For each pair of voices being checked, v1 & v2:
	for (var v1 = 0; v1 < totalVoicesChkd; v1++)
	{
		for (var v2 = v1+1; v2 < totalVoicesChkd; v2++)
		{
			// Make sure there is a note to check at each position we are trying to check.
			if ( (!voiceChkd[v1].notes[i].isEnd) && (!voiceChkd[v1].notes[j].isEnd) 
			  && (!voiceChkd[v2].notes[i].isEnd) && (!voiceChkd[v2].notes[j].isEnd) )
			{
				if ( (!voiceChkd[v1].notes[i].isRest) && (!voiceChkd[v1].notes[j].isRest) 
				  && (!voiceChkd[v2].notes[i].isRest) && (!voiceChkd[v2].notes[j].isRest) )
				{
					// Now we know the notes are notes and not rests or past the end of the score.
					// Check whether there are parallel perfect fifths/octaves between the notes.
					// If the notes are not identical, make sure they are not perfect fifths/octaves.
					// If both v1 notes are the same, and both v2 notes are the same, nothing is done.

					if  ( (voiceChkd[v1].notes[i].note.pitch != voiceChkd[v1].notes[j].note.pitch) 
					    || (voiceChkd[v2].notes[i].note.pitch != voiceChkd[v2].notes[j].note.pitch)
						)
					{
						if (
					        (isPerfectFifth(voiceChkd[v1].notes[i].note, voiceChkd[v2].notes[i].note)) 
					     && (isPerfectFifth(voiceChkd[v1].notes[j].note, voiceChkd[v2].notes[j].note))
					       )
						{
							// print(" true = Perfect 5ths\n");
							// We have parallel perfect fifths. Mark it on the score & make the notes red.
							writeErrorToScore4Notes2Voices(curScore, voiceChkd, "Consecutive 5ths\n", v1, v2, i, j, perfectFifthsColor);
						}
						if (
					        (isPerfect8va(voiceChkd[v1].notes[i].note, voiceChkd[v2].notes[i].note)) 
					     && (isPerfect8va(voiceChkd[v1].notes[j].note, voiceChkd[v2].notes[j].note))
					       )
						{
							// print(" true = Perfect 8va\n");
							// We have parallel perfect octaves. Mark it on the score & make the notes red.
							writeErrorToScore4Notes2Voices(curScore, voiceChkd, "Consecutive octaves\n", v1, v2, i, j, perfect8vaColor);
						}

					}

				} // end if not isRest for each note
			} // end if not isEnd for each note
		} // end for v2
	} // end for v1
};

// --------------------------- checkExposedPerfect5thsAndOctaves -----------------------------
function checkExposedPerfect5thsAndOctaves(curScore, voiceChkd, v1, v2, i, j)
{
	// i & j are the indexes of the two chords to check in voiceChkd.
	// Typically, j = i+1, unless there is a "passing note" between i & j.
	// NOTE: Detection of passing notes is not yet implemented, so curently j = i+1 when
	// this function is called.
	// v1 is the soprano voice index, and v2 is the bass voice index.

	// Make sure there is a note to check at each position we are trying to check.
	if ( (!voiceChkd[v1].notes[i].isEnd) && (!voiceChkd[v1].notes[j].isEnd) 
		&& (!voiceChkd[v2].notes[i].isEnd) && (!voiceChkd[v2].notes[j].isEnd) )
	{
		if ( (!voiceChkd[v1].notes[i].isRest) && (!voiceChkd[v1].notes[j].isRest) 
			&& (!voiceChkd[v2].notes[i].isRest) && (!voiceChkd[v2].notes[j].isRest) )
		{
			// Now we know the notes are notes and not rests or past the end of the score.
			// Check whether there are parallel perfect fifths/octaves between the notes at j.
			// If the notes are not identical, make sure they are not perfect fifths/octaves.
			// If both v1 notes are the same, and both v2 notes are the same, nothing is done.

			if  ( (voiceChkd[v1].notes[i].note.pitch != voiceChkd[v1].notes[j].note.pitch) 
				|| (voiceChkd[v2].notes[i].note.pitch != voiceChkd[v2].notes[j].note.pitch)
				)
			{
				if (
					(isPerfectFifth(voiceChkd[v1].notes[j].note, voiceChkd[v2].notes[j].note)) // a perfect 5th and
					&& (!isIntervalType(1, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note)) // Not a step in the soprano
					&& ( (   (voiceChkd[v1].notes[i].note.pitch > voiceChkd[v1].notes[j].note.pitch) // Similar motion approach
					      && (voiceChkd[v2].notes[i].note.pitch > voiceChkd[v2].notes[j].note.pitch)
						  ) 
						||
						 (   (voiceChkd[v1].notes[i].note.pitch < voiceChkd[v1].notes[j].note.pitch)
					      && (voiceChkd[v2].notes[i].note.pitch < voiceChkd[v2].notes[j].note.pitch)
						  )
						)
					)
				{
					//print("exposed 5th");
					writeErrorToScore4Notes2Voices(curScore, voiceChkd, "Exposed 5th\n", v1, v2, i, j, perfectFifthsColor);
				}
				if (
					(isPerfect8va(voiceChkd[v1].notes[j].note, voiceChkd[v2].notes[j].note)) // a perfect octave and
					&& (!isIntervalType(1, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note)) // Not a step in the soprano
					&& ( (   (voiceChkd[v1].notes[i].note.pitch > voiceChkd[v1].notes[j].note.pitch) // Similar motion approach
					      && (voiceChkd[v2].notes[i].note.pitch > voiceChkd[v2].notes[j].note.pitch)
						  ) 
						||
						 (   (voiceChkd[v1].notes[i].note.pitch < voiceChkd[v1].notes[j].note.pitch)
					      && (voiceChkd[v2].notes[i].note.pitch < voiceChkd[v2].notes[j].note.pitch)
						  )
						)
					)
				{
					//print("exposed 8va");
					writeErrorToScore4Notes2Voices(curScore, voiceChkd, "Exposed octaves\n", v1, v2, i, j, perfect8vaColor);
				}

			}

		} // end if not isRest for each note
	} // end if not isEnd for each note

};

//----------------------------
function writeErrorToScore1Voice(curScore, voiceChkd, errorString, v1, i, j, k, thisErrorColor)
{
		var myText = new Text(curScore);
		myText.yOffset = -4.00;
		myText.xOffset = 0.00;
		myText.text = errorString +"v=" +(voiceChkd[v1].voice+1);
						
		voiceChkd[v1].cursorCurNote.putStaffText(myText);
		voiceChkd[v1].notes[i].note.color = new QColor(thisErrorColor);
		voiceChkd[v1].notes[j].note.color = new QColor(thisErrorColor);
		voiceChkd[v1].notes[k].note.color = new QColor(thisErrorColor);
};
  
// --------------------------- checkSingleVoiceIntervals -----------------------------
function checkSingleVoiceIntervals(curScore, voiceChkd, v1, i,j,k)
{
	// i, j & k are the indexes of the two (i&j) or three (i,j&k) notes to check in voiceChkd[v1].
	// Typically, j = i+1, k=j+1.
	// NOTE: Detection of passing notes is not yet implemented, so curently j = i+1 when
	// this function is called.
	// THE CALLING FUNCTION GUARANTEES (!voiceChkd[v1].notes[i].isEnd) && (!voiceChkd[v1].notes[j].isEnd)
	// There is no guarantee for voiceChkd[v1].notes[k].isEnd

	if ( (!voiceChkd[v1].notes[i].isRest) && (!voiceChkd[v1].notes[j].isRest) 
	   )
	{
		// Now we know the notes are notes and not rests or past the end of the score.
		// Check whether there are forbidden intervals between the notes,
		// if the notes are not identical.

		if  ( (voiceChkd[v1].notes[i].note.pitch != voiceChkd[v1].notes[j].note.pitch) 
		    )
		{
			//---------------------------------------------------------------------------------------------
			// check for: augmented 2nd (3,1), aug. 4th (6,3), aug 5th (8,4)
			if (   isInterval(1, 0, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // aug. unison/8va
			    || isInterval(3, 1, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // aug. 2nd
				|| isInterval(5, 2, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // aug. 3rd
				|| isInterval(6, 3, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // aug. 4th
				|| isInterval(8, 4, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // aug. 5th
				|| isInterval(10, 5, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // aug. 6th
				|| isInterval(12, 6, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // aug. 7th
			   )
			{
				// print(" true = Augmented interval\n");
				// We have an illegal augmented interval. Mark it on the score & make the notes red.
				writeErrorToScore1Voice(curScore, voiceChkd, "Augmented interval\n", v1, i, j, j, errorColor);
			}
			//---------------------------------------------------------------------------------------------
			// check for diminished 5th: they must be followed by a note within the interval.
			if (
			        isInterval(6, 4, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) 
			   )
			{
				// print(" true = Diminished 5th\n");
				// We have a diminished 5th.  Check if the following note is within the interval.
				if(!voiceChkd[v1].notes[k].isEnd && !voiceChkd[v1].notes[k].isRest)
				{
					if(!isWithinInterval(voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note, voiceChkd[v1].notes[k].note))
					{
						writeErrorToScore1Voice(curScore, voiceChkd, "Dim 5th should be followed by\nnote within interval ", 
						v1, i, j, k, errorColor);
					}
				}
									
			}
			//---------------------------------------------------------------------------------------------
			// Check for dim. 4th & 7th - they are to be avoided for present.
			if (   isInterval(4, 3, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // dim. 4th
			    || isInterval(9, 6, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // dim. 7th
			   )
			{
				// print(" true = Diminished 4th or 7th\n");
				writeErrorToScore1Voice(curScore, voiceChkd, "Dim. 4th or 7th \n avoid for now ", v1, i, j, j, errorColor);
			}
			//---------------------------------------------------------------------------------------------
			// Check for octave - should be followed by notes within compass.
			var lowNote = voiceChkd[v1].notes[i].note;
			var highNote = voiceChkd[v1].notes[j].note;
			if (lowNote.pitch > highNote.pitch)
			{
				lowNote = voiceChkd[v1].notes[j].note;
				highNote = voiceChkd[v1].notes[i].note;
			}
			if ( (highNote.pitch - lowNote.pitch) == 12) // An octave
			{
				// print(" true = Octave");
				var isOctaveOk = true;
				if(!voiceChkd[v1].notes[k].isEnd && !voiceChkd[v1].notes[k].isRest)
				{
					if(!isWithinInterval(voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note, voiceChkd[v1].notes[k].note))
					{
						isOctaveOk = false;
					}
				}
				if(!voiceChkd[v1].notes[i-1].isEnd && !voiceChkd[v1].notes[i-1].isRest)
				{
					if(!isWithinInterval(voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note, voiceChkd[v1].notes[i-1].note))
					{
						isOctaveOk = false;
					}
				}
				if(!isOctaveOk)
				{
					writeErrorToScore1Voice(curScore, voiceChkd, "8va should be preceeded & followed\nby notes within compass", 
					v1, i, j, j, errorColor);
				}
			}

			//---------------------------------------------------------------------------------------------
			// Check for dim. 6th & other 6ths.
			// 6ths are better avoided, but if used, should be followed by note within its compass.
			if (   isInterval(7, 5, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // dim. 6th
			    || isInterval(8, 5, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // min. 6th
				|| isInterval(9, 5, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // maj. 6th
			   )
			{
				// print(" true = Dim, minor or major 6th\n");
				if(!voiceChkd[v1].notes[k].isEnd && !voiceChkd[v1].notes[k].isRest)
				{
					if(!isWithinInterval(voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note, voiceChkd[v1].notes[k].note))
					{
						writeErrorToScore1Voice(curScore, voiceChkd, "6th better avoided, but \n should be followed by note in interval ", 
						v1, i, j, k, errorColor);
					}
					else
					{
						writeErrorToScore1Voice(curScore, voiceChkd, "6th better avoided\n", v1, i, j, j, errorColor);
					}
				} else {
					writeErrorToScore1Voice(curScore, voiceChkd, "6th better avoided, but \n should be followed by note in interval ", 
					v1, i, j, j, errorColor);
				}

			}
			//---------------------------------------------------------------------------------------------
			// Check for 7th & 9th & larger - they are to be avoided.
			var lowNote = voiceChkd[v1].notes[i].note;
			var highNote = voiceChkd[v1].notes[j].note;
			if (lowNote.pitch > highNote.pitch)
			{
				lowNote = voiceChkd[v1].notes[j].note;
				highNote = voiceChkd[v1].notes[i].note;
			}
			if (   isInterval(10, 6, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // min. 7th
			    || isInterval(11, 6, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[j].note) // maj. 7th
				|| ((highNote.pitch - lowNote.pitch) > 12) // Larger than 8th
		       )
			{
				// print(" true = 7th, 9th or larger interval\n");
				// We have a 7th, 9th or larger interval.
				writeErrorToScore1Voice(curScore, voiceChkd, "No 7ths, 9ths or larger intervals\n", v1, i, j, j, seventhAndLargerColor);
			}
			//---------------------------------------------------------------------------------------------
			// Check for 7th & 9th with one note in between.
			if(!voiceChkd[v1].notes[k].isEnd && !voiceChkd[v1].notes[k].isRest)
			{
				if (isWithinInterval(voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[k].note, voiceChkd[v1].notes[j].note))
				{
					var lowNote = voiceChkd[v1].notes[i].note;
					var highNote = voiceChkd[v1].notes[k].note;
					if (lowNote.pitch > highNote.pitch)
					{
						lowNote = voiceChkd[v1].notes[k].note;
						highNote = voiceChkd[v1].notes[i].note;
					}
					if (   isInterval(10, 6, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[k].note) // min. 7th
						|| isInterval(11, 6, voiceChkd[v1].notes[i].note, voiceChkd[v1].notes[k].note) // maj. 7th
						|| ((highNote.pitch - lowNote.pitch) > 12)
						)
					{
						writeErrorToScore1Voice(curScore, voiceChkd, "No 7ths, 9ths & larger \neven with 1 note in between ", 
						v1, i, j, k, seventhAndLargerColor);
					}
				}
			}

		} // end if notes are not the same

	} // end if not isRest for each note
};


//------------------------------ printCurrentChord --------------------------

function printCurrentChord(voiceChkd, totalVoicesChkd)
{
	// For all voices, prints the chord currently being analyzed.
	print("Current Chord: (totalVoicesChkd = " + totalVoicesChkd);
	for (var v1 = 0; v1 < totalVoicesChkd; v1++)
	{
		if (voiceChkd[v1].notes[StartCheckNote].isEnd)
		{
			print("v = " + v1 + "; isEnd = true");
			
		} else {
			if (voiceChkd[v1].notes[StartCheckNote].isRest)
			{
				print("v = " + v1 + "; isRest = true; origStartTick = " + voiceChkd[v1].notes[StartCheckNote].origStartTick);
							}
			else
			{
				print("v = " + v1 + "; origStartTick = " + voiceChkd[v1].notes[StartCheckNote].origStartTick);
				printNoteName(voiceChkd[v1].notes[StartCheckNote].note.tpc);
			}
		}
	}
			

};

//------------------------------ moveAllNotesOverIn1Voice ----------------------------
function moveAllNotesOverIn1Voice(curScore, voiceChkdi, numNotesSaved)
{
	// Moves all notes over for a SINGLE VOICE ONLY.
	for (var j=0; j<numNotesSaved-1; j++)
	{
			voiceChkdi.notes[j].isEnd = voiceChkdi.notes[j+1].isEnd;
			if (!voiceChkdi.notes[j].isEnd)
			{
				voiceChkdi.notes[j].isRest = voiceChkdi.notes[j+1].isRest;
				voiceChkdi.notes[j].origStartTick = voiceChkdi.notes[j+1].origStartTick;
				voiceChkdi.notes[j].thisNoteTicks = voiceChkdi.notes[j+1].thisNoteTicks;
				voiceChkdi.notes[j].leftoverTicks = voiceChkdi.notes[j+1].leftoverTicks;
				voiceChkdi.notes[j].actualStartTick = voiceChkdi.notes[j+1].actualStartTick;
				
				if (!voiceChkdi.notes[j].isRest)
				{
					voiceChkdi.notes[j].note = voiceChkdi.notes[j+1].note;
					
				} 
			}
		}
		// Make the cursor voiceChkdi.cursorCurNote point to the note at index 1 (i.e. index StartCheckNote).
		if (!voiceChkdi.notes[StartCheckNote].isEnd)
		{
			while (voiceChkdi.cursorCurNote.tick() < voiceChkdi.notes[StartCheckNote].origStartTick)
			{
				voiceChkdi.cursorCurNote.next();
			}
		}

};

//------------------------------ moveAllNotesOverOneSpaceAndReadNext --------------------------

function moveAllNotesOverOneSpaceAndReadNext(curScore, selectionEnd, voiceChkd, totalVoicesChkd)
{

	// For each voice, and each j,
	// copies voiceChkd[voice].notes[j+1] into voiceChkd[voice].notes[j]
	// then reads a new note into the last voiceChkd[voice].notes[j]
	
	for (var i = 0; i < totalVoicesChkd; i++)
	{
		// Move each note over by one index.
		moveAllNotesOverIn1Voice(curScore, voiceChkd[i], numNotesSaved)
	}

	// Split the last note if necessary to make all simultaneous notes the same length, and for unsplit notes,
	// read the next note.
	// (Splitting happens only in this plugin's data structure, not in the score itself.)
	makeNoteOneLenAndReadNext(curScore, selectionEnd, voiceChkd, totalVoicesChkd, numNotesSaved-2, numNotesSaved-1);	
		
	// printCurrentChord(voiceChkd, totalVoicesChkd);

};

// -------------------------------- makeNoteOneLenAndReadNext ---------------------------------------------
// Split the note at curIdx if necessary to make all simultaneous notes the same length, and for unsplit notes,
// read the next note into nxtIdx (split notes will go into nxtIdx also).
// (Splitting happens only in this plugin's data structure, not in the score itself.)
//
function makeNoteOneLenAndReadNext(curScore, selectionEnd, voiceChkd, totalVoicesChkd, curIdx, nxtIdx)
{
	// For each voice being checked,
	// Check that the curIdx notes are notes or rests, and work out the minimum note/rest length.
	var minLen = 0;
	var tempLen = 0;
	for (var i = 0; i < totalVoicesChkd; i++)
	{
		if (voiceChkd[i].notes[curIdx].isEnd)
		{
			// leave minLen as is.
		} else {
			if (minLen > 0)
			{
				if (voiceChkd[i].notes[curIdx].thisNoteTicks < minLen) 
				{
					// Note: consecutive rests have already been treated as if they were combined
					// for this plugin (when they were read), so notes are not going to be shortened  
					// just because a simultaneous rest is shorter than it, if the rest is followed
					// by another rest.
					minLen = voiceChkd[i].notes[curIdx].thisNoteTicks;
				}
			} else {
				// minLen was 0; set it to the value for this note.
				minLen = voiceChkd[i].notes[curIdx].thisNoteTicks;
			}

		}
	} // end for i < totalVoicesChkd

	// minLen is now the length of the shortest simultaneous current note or (combined) rest.  Now "shorten" (in the
	// data for this plugin only) every simultaneous current note or rest to be the same length.
	// (The notes/rests on the score itself remain unchanged.)

	for (var i = 0; i < totalVoicesChkd; i++)
	{
		if (voiceChkd[i].notes[curIdx].isEnd)
		{
			// don't do anything to this voice.
		} else {
			if ((minLen > 0) && (voiceChkd[i].notes[curIdx].thisNoteTicks > minLen)  )
			{
				// Split the note up into two notes.
			   	voiceChkd[i].notes[curIdx].leftoverTicks = voiceChkd[i].notes[curIdx].thisNoteTicks - minLen;
				voiceChkd[i].notes[curIdx].thisNoteTicks = minLen;

				voiceChkd[i].notes[nxtIdx].isEnd = false;
				voiceChkd[i].notes[nxtIdx].isRest = voiceChkd[i].notes[curIdx].isRest;
				voiceChkd[i].notes[nxtIdx].origStartTick = voiceChkd[i].notes[curIdx].origStartTick;
				voiceChkd[i].notes[nxtIdx].thisNoteTicks = voiceChkd[i].notes[curIdx].leftoverTicks;
				voiceChkd[i].notes[nxtIdx].actualStartTick = voiceChkd[i].notes[curIdx].actualStartTick + minLen;
				
				voiceChkd[i].notes[nxtIdx].leftoverTicks = 0;
				if (!voiceChkd[i].notes[nxtIdx].isRest)
				{
					voiceChkd[i].notes[nxtIdx].note = voiceChkd[i].notes[curIdx].note;
				}
			} else {
				// This note/rest is the minimum length; read the next one.
				var upToTick = voiceChkd[i].notes[curIdx].actualStartTick + minLen;
				//print(" make1Len upToTick = " + upToTick + " minLen " + minLen +
				//	 "voiceChkd[i].notes[curIdx].actualStartTick " + voiceChkd[i].notes[curIdx].actualStartTick);
				readNextNote(curScore, voiceChkd[i].cursor, selectionEnd, voiceChkd[i].notes[nxtIdx], 
						upToTick, voiceChkd[i].staff, voiceChkd[i].voice, false);
			}

		}
	} // end for i < totalVoicesChkd

};

// ----------------------- isEndOfSelectionOrFile ------------------------------
function isEndOfSelectionOrFile(curScore, cursor, selectionEnd, staff, voice)
{
	if (cursor.eos()) { return true; }
	if ( (cursor.voice!=voice) || (cursor.staff != staff))
	{
		return true;
	}
	
	if (selectionEnd.eos())
	{
		// There was no selection; we are checking the whole file:
		return cursor.eos();
	}
	else
	{
		// There is a selection; compare with selectionEnd
		return (!(cursor.tick() < selectionEnd.tick()));
	}
};


// -------------------- FUNCTION:   readNextNote -----------------------------

function readNextNote(curScore, cursor, selectionEnd, myNote, upToTick, staff, voice, joinNotes)
{
	// Reads the next note at the cursor into the myNote Object (i.e. myNote = voiceChkd[i].notes[j] for some i & j)
	var myRest = new Rest();
	var myChord = new Chord();
	var nothingRead = true;
	var nextThingSameType = true;

	// print("upToTick = " + upToTick + " cursor.tick() = " + cursor.tick());

	if (isEndOfSelectionOrFile(curScore, cursor, selectionEnd, staff, voice))
	{
		myNote.isEnd = true;
		// print("isEnd = true");
		return;
	}

	while (!isEndOfSelectionOrFile(curScore, cursor, selectionEnd, staff, voice) && (nothingRead || nextThingSameType))
	{
		while ( (!isEndOfSelectionOrFile(curScore, cursor, selectionEnd, staff, voice))
		    && (!cursor.isChord() )
			&& (!cursor.isRest()  )
			)
		{
			cursor.next();
		}
		if (isEndOfSelectionOrFile(curScore, cursor, selectionEnd, staff, voice))
		{
			myNote.isEnd = true;
			// print("isEnd = true");
			return;
		}

		if (cursor.tick() < upToTick)
		{
			while ((cursor.tick() < upToTick))
			{
				print("ERROR....");
				if (cursor.isChord() || cursor.isRest())
				{
					print("ERROR: Next chord or rest starts before existing one finishes. upToTick = " + upToTick
					+ " next cursor tick = " + cursor.tick() + " cursor.isRest = " + cursor.isRest() + "cursor.isChord = " + cursor.isChord());
					print("selectionEnd.tick() = " + selectionEnd.tick());
				}
				cursor.next();
				if ( isEndOfSelectionOrFile(curScore, cursor, selectionEnd, staff, voice) )
				{
					if(nothingRead) {
						 myNote.isEnd = true; 
					}
					return; 
				}
			} // end while
		} // end if (cursor.tick < upToTick)

		if (nothingRead)
		{
			myNote.isEnd = false;
			myNote.leftoverTicks = 0;
			myNote.origStartTick = upToTick;
			myNote.actualStartTick = upToTick;
			//print(upToTick);

		}
		if (cursor.tick() > upToTick)
		{
			if(nothingRead)
			{
				myNote.isRest = true;
				myNote.thisNoteTicks = cursor.tick() - upToTick;
				upToTick = cursor.tick();
				nothingRead = false;
			}
			else if (myNote.isRest)
			{
				myNote.thisNoteTicks = cursor.tick() - myNote.actualStartTick;
				upToTick = cursor.tick();
			}
			else
			{
				nextThingSameType = false;
			}
			
		} else { // we have cursor.tick() == upToTick

			if (cursor.isChord())
			{
				myChord = cursor.chord();
				var tmpNote = myChord.topNote();
				if (myChord.notes > 1)
				{
					// We are only checking one note per chord!
					var myText = new Text(curScore);
					myText.yOffset = -4.00;
					myText.xOffset = 0.00;
					myText.text = "MORE THAN ONE NOTE in staff " + (cursor.staff+1) + ", voice " + (cursor.voice+1);
					cursor.putStaffText(myText);
					tmpNote.color = new QColor(moreNotesPerChord);
				} // if more than one note in chord
				
				
				if (nothingRead)
				{
					myNote.isRest = false;
					myNote.thisNoteTicks = myChord.tickLen;
					myNote.note = tmpNote;
					upToTick = myNote.actualStartTick + myNote.thisNoteTicks;
					nothingRead = false;
					cursor.next();
				} else
				{
					if(joinNotes && (myNote.isRest == false) && (tmpNote.pitch == myNote.note.pitch))
					{
						myNote.thisNoteTicks = myNote.thisNoteTicks + myChord.tickLen;
						upToTick = myNote.actualStartTick + myNote.thisNoteTicks;
						cursor.next();
					}
					else
					{
						nextThingSameType = false;
					}
				}
			} // end if cursor.isChord()
			else {
				if (nothingRead || myNote.isRest)
				{
					myNote.isRest = true;
					if(cursor.isRest())
					{
						//print("Real rest");
						var myRest = cursor.rest();
						if(nothingRead)
						{
							myNote.thisNoteTicks = myRest.tickLen;
						} else
						{
							myNote.thisNoteTicks = myNote.thisNoteTicks + myRest.tickLen;
						}
						upToTick = myNote.actualStartTick + myNote.thisNoteTicks;
						cursor.next();

					} else {
						// this is neither a rest nor a note; treat it as a rest in the data structure for this plugin.
						//print("Neither rest nor note.");
						print("ERROR: SHOULD NEVER GET HERE AS ALL NOTES THAT AREN'T CHORDS OR RESTS SHOULD BE FFD AT BEGINNING");
						cursor.next();
						myNote.thisNoteTicks = cursor.tick() - myNote.actualStartTick;
						upToTick = cursor.tick();
					}
				} else
				{
					nextThingSameType = false;
				}
			} // end if (cursor.tick() > upToTick) else ...
	
		} // end if (cursor.tick() > upToTick) else....

		nothingRead = false;
		if (myNote.thisNoteTicks == 0)
		{
			nothingRead = true;
		}

	} // end while (!isEndOfSelectionOrFile(curScore, cursor, selectionEnd, staff, voice) && (nothingRead || nextThingSameType))
};

//------------------------------ rewindCursors ----------------------------------------
function rewindCursors(voiceChkd, currVoiceChkd)
{
	// Puts the cursors for the given voice at the start of the selection, or if no selection,
	// at the beginning of the score.
	voiceChkd[currVoiceChkd].cursor.staff = voiceChkd[currVoiceChkd].staff;
	voiceChkd[currVoiceChkd].cursorCurNote.staff = voiceChkd[currVoiceChkd].staff;
	voiceChkd[currVoiceChkd].cursor.goToSelectionStart();
	voiceChkd[currVoiceChkd].cursorCurNote.goToSelectionStart();
	if(voiceChkd[currVoiceChkd].cursorCurNote.eos())
	{
		voiceChkd[currVoiceChkd].cursorCurNote.rewind();
		voiceChkd[currVoiceChkd].cursor.rewind();
	}
	voiceChkd[currVoiceChkd].cursor.staff = voiceChkd[currVoiceChkd].staff;
	voiceChkd[currVoiceChkd].cursorCurNote.staff = voiceChkd[currVoiceChkd].staff;
	voiceChkd[currVoiceChkd].cursor.voice = voiceChkd[currVoiceChkd].voice; // voice must be set after goto.
	voiceChkd[currVoiceChkd].cursorCurNote.voice = voiceChkd[currVoiceChkd].voice;

}


// -----------------------------  run -------------------------------------------------

function run() 
{
	
	if (typeof curScore === 'undefined')
            return;

	  var totalVoicesChkd = 0;
	  var cursor       = new Cursor(curScore);
      var selectionEnd = new Cursor(curScore);
	  var voiceChkd = Array();

	  // Find the beginning and end of the selection.

	  cursor.staff = 0;
	  cursor.goToSelectionStart();
	  selectionEnd.goToSelectionEnd();

	  if(cursor.eos())
	  {
		// There is no selection in the current score; check the entire score, and set
		// cursor to point to the beginning of the score, and selectionEnd to the end of the score.
		cursor.staff = 0;
		cursor.voice = 0;
		cursor.rewind();
		
		// print(" curScore.staves = " + curScore.staves);
		endStaff = curScore.staves;
	  } else {
		endStaff = selectionEnd.staff
	  }

	 // We now have cursor pointing to the start of the selection (or score if no selection was made), 
	 // and selectionEnd pointing to the end of the selection (or score if no selection was made).
	 // --------------------------
      var startStaff = cursor.staff;
	  
	  var currVoiceChkd = 0;

	  // Find out which voices contain notes, and save a cursor for each of those voices;
	  // Also, read the first note in each such voice.
	  // The code is designed for only one note per voice at a single time (i.e. one-note chords)
	  // If any chord contains more than one note, its colour is changed and a text is attached to it,
	  // describing the problem (this is done by the readNextNote(,,,) function).

	  // print(" endStaff = " + endStaff);
      for (var staff = startStaff; staff < endStaff; ++staff) {

            for (var v = 0; v < 4; v++) { 
				// print("staff = " + staff + "; v = " + v + "\n");
				  cursor.staff = staff;	         
                  cursor.goToSelectionStart(); // set voice to 0
                  cursor.voice = v; //voice has to be set after goTo
                  cursor.staff = staff;

				  if(cursor.eos())
				  {
					// There is no selection in the current score; check the entire score.
					cursor.rewind();
				  }

				  var stopChecking = cursor.eos();
				  while (! stopChecking )
				  {
				        // print("Checking staff " + staff + " voice " + v);
                        if (cursor.isChord()) {
						        //print("     CREATING NEW VoiceChkd[currVoiceChkd] Object \n");
								voiceChkd[currVoiceChkd] = new Object();
								voiceChkd[currVoiceChkd].staff = cursor.staff;
								voiceChkd[currVoiceChkd].voice = cursor.voice;
								voiceChkd[currVoiceChkd].cursor = new Cursor(curScore);
								voiceChkd[currVoiceChkd].cursorCurNote = new Cursor(curScore);
								rewindCursors(voiceChkd, currVoiceChkd);

								voiceChkd[currVoiceChkd].notes = new Array();
								for(var i=0; i<numNotesSaved; i++)
								{
								    voiceChkd[currVoiceChkd].notes[i] = new Object();
								} //end for i
								for (var curIdx = 0;curIdx < StartCheckNote; curIdx++)
								{
									voiceChkd[currVoiceChkd].notes[curIdx].isEnd = true;
								}
								//print(" upToTick = voiceChkd[currVoiceChkd].cursor.tick() = " + voiceChkd[currVoiceChkd].cursor.tick());
								var upToTick = voiceChkd[currVoiceChkd].cursor.tick();
								readNextNote(curScore, voiceChkd[currVoiceChkd].cursor, selectionEnd, voiceChkd[currVoiceChkd].notes[StartCheckNote],
									upToTick, voiceChkd[currVoiceChkd].staff, voiceChkd[currVoiceChkd].voice, false);
																
								currVoiceChkd=currVoiceChkd+1;
								stopChecking = true;
							}
						cursor.next();
						stopChecking = stopChecking || isEndOfSelectionOrFile(curScore, cursor, selectionEnd, staff, v);
					} // end while
            } //end for v
       } // end for staff
		totalVoicesChkd = currVoiceChkd;

		if(totalVoicesChkd > 1)
		{
			// Read two more notes per voice; Saved note 0 of the voice is blank; Saved note 1 is read, but lengths may be different.
			// Thus we must compare lengths, shift parts of notes that are too long into the next saved note, and read any extra notes.
			var curIdx = StartCheckNote;
			for (var nxtIdx = curIdx + 1; nxtIdx < numNotesSaved; nxtIdx++)
			{
				makeNoteOneLenAndReadNext(curScore, selectionEnd, voiceChkd, totalVoicesChkd, curIdx, nxtIdx);
				curIdx++;
			}
			// print("Hi!");
			for (var i=0; i<numNotesSaved; i++)
			{
				for (var j=0; j<totalVoicesChkd; j++)
				{
					//printNoteOrRest(voiceChkd, j, i);
				}
				//print("-----");
			}

			// While there are still notes to check, do all the required multi-voice checks and move along one note.
			var finished = false;
			while (!finished) {
			// Check whether there are any notes left to check:
				finished = true;
				for (var i = 0; i<totalVoicesChkd; i++)
				{
					if (!voiceChkd[i].notes[1].isEnd)
					{
						finished = false;
					}
				}
				if (!finished)
				{
					//printCurrentChord(voiceChkd, totalVoicesChkd);
					// Do required checks:
	// ------ MULTI-VOICE CHECKS HERE !
					checkParallelPerfect5thsAndOctaves(curScore, voiceChkd, totalVoicesChkd, StartCheckNote, StartCheckNote+1);
					checkExposedPerfect5thsAndOctaves(curScore, voiceChkd, 0, totalVoicesChkd-1, StartCheckNote, StartCheckNote+1);

					// Move along one note:
					moveAllNotesOverOneSpaceAndReadNext(curScore, selectionEnd, voiceChkd, totalVoicesChkd);
				}
			} // end while
		} // end if at least 2 voices to check

		// Do single voice checks
		for (currVoiceChkd=0; currVoiceChkd<totalVoicesChkd; currVoiceChkd++)
		{
			rewindCursors(voiceChkd, currVoiceChkd);
			for (var curIdx = 0;curIdx < StartCheckNote; curIdx++)
			{
				voiceChkd[currVoiceChkd].notes[curIdx].isEnd = true;
			}
			// Read 3 more notes for this voice; Saved note 0 of the voice is blank.
			var upToTicks = voiceChkd[currVoiceChkd].cursor.tick();
			// print("Starting read of notes at tick " + upToTicks);
			readNextNote(curScore, voiceChkd[currVoiceChkd].cursor, selectionEnd, voiceChkd[currVoiceChkd].notes[curIdx],
						upToTicks, voiceChkd[currVoiceChkd].staff, voiceChkd[currVoiceChkd].voice, true);

			for (var curIdx = StartCheckNote+1; curIdx < numNotesSaved; curIdx++)
			{
				upToTicks = voiceChkd[currVoiceChkd].notes[curIdx-1].actualStartTick 
					          + voiceChkd[currVoiceChkd].notes[curIdx-1].thisNoteTicks;
				//print(" upToTicks =" + upToTicks);
				readNextNote(curScore, voiceChkd[currVoiceChkd].cursor, selectionEnd, voiceChkd[currVoiceChkd].notes[curIdx],
						upToTicks, voiceChkd[currVoiceChkd].staff, voiceChkd[currVoiceChkd].voice, true);
			}
			
			while ((!voiceChkd[currVoiceChkd].notes[StartCheckNote].isEnd) && (!voiceChkd[currVoiceChkd].notes[StartCheckNote+1].isEnd)) 
			{
	// ------ SINGLE VOICE CHECKS HERE !
				checkSingleVoiceIntervals(curScore, voiceChkd, currVoiceChkd, StartCheckNote, StartCheckNote+1, StartCheckNote+2);
				moveAllNotesOverIn1Voice(curScore, voiceChkd[currVoiceChkd], numNotesSaved);
				
				upToTicks = voiceChkd[currVoiceChkd].notes[numNotesSaved-2].actualStartTick 
						  + voiceChkd[currVoiceChkd].notes[numNotesSaved-2].thisNoteTicks;

				readNextNote(curScore, voiceChkd[currVoiceChkd].cursor, selectionEnd, voiceChkd[currVoiceChkd].notes[numNotesSaved-1],
							upToTicks, voiceChkd[currVoiceChkd].staff, voiceChkd[currVoiceChkd].voice, true);
			}
		}


};
	
function close() 
	{
	}; 
	
var mscorePlugin = 
{   
	majorVersion:  1,   
	minorVersion:  1,  
	menu: 'Plugins.Check Harmony Rules',   
	init: init,   
	run: run,   
	onClose: close
};

mscorePlugin;




