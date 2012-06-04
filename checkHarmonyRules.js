// MuseScore
// 
// Check Parts - check Soprano, Alto, Tennor, Bass 
//  for conformance to good harmony writing rules.

// Current feature list:
//
// Checks for parallel perfect 5ths and octaves, 
//    including consecutive 5ths and octaves in contrary motion,
//    and unison to octave and octave to unison.
//   (note: different intervals that are enharmonically equivalent 
//    to a perfect 5th or octave are NOT detected).
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
//   For the purposes of analysis, if different voices contain simultaneous notes of different lengths,
//      the longer note(s) are treated as if they were split into shorter notes of the same length as the shortest
//      simultaneous note.  No notes on the score itself are changed (apart from the colour of the notes).


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
var numNotesSaved = 4;                          // for each voice, the number of notes held in memory at once.
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
			"; .thisNoteTicks = " + voiceChkd[i].notes[j].thisNoteTicks + "; leftoverTicks = " + voiceChkd[i].notes[j].leftoverTicks + "\n");
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
							var myText = new Text(curScore);
							myText.yOffset = -4.00;
							myText.xOffset = 0.00;
							myText.text = "Consecutive 5ths";
							voiceChkd[v1].cursorCurNote.putStaffText(myText);
							voiceChkd[v1].notes[i].note.color = new QColor(perfectFifthsColor);
							voiceChkd[v1].notes[j].note.color = new QColor(perfectFifthsColor);
							voiceChkd[v2].notes[i].note.color = new QColor(perfectFifthsColor);
							voiceChkd[v2].notes[j].note.color = new QColor(perfectFifthsColor);
						}
						if (
					        (isPerfect8va(voiceChkd[v1].notes[i].note, voiceChkd[v2].notes[i].note)) 
					     && (isPerfect8va(voiceChkd[v1].notes[j].note, voiceChkd[v2].notes[j].note))
					       )
						{
							// print(" true = Perfect 8va\n");
							// We have parallel perfect octaves. Mark it on the score & make the notes red.
							var myText = new Text(curScore);
							myText.yOffset = -4.00;
							myText.xOffset = 0.00;
							myText.text = "Consecutive octaves";
							voiceChkd[v1].cursorCurNote.putStaffText(myText);
							voiceChkd[v1].notes[i].note.color = new QColor(perfect8vaColor);
							voiceChkd[v1].notes[j].note.color = new QColor(perfect8vaColor);
							voiceChkd[v2].notes[i].note.color = new QColor(perfect8vaColor);
							voiceChkd[v2].notes[j].note.color = new QColor(perfect8vaColor);
						}

					}

				} // end if not isRest for each note
			} // end if not isEnd for each note
		} // end for v2
	} // end for v1
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

//------------------------------ moveAllNotesOverOneSpaceAndReadNext --------------------------

function moveAllNotesOverOneSpaceAndReadNext(curScore, selectionEnd, voiceChkd, totalVoicesChkd)
{

	// For each voice, and each j,
	// copies voiceChkd[voice].notes[j+1] into voiceChkd[voice].notes[j]
	// then reads a new note into the last voiceChkd[voice].notes[j]
	
	for (var i = 0; i < totalVoicesChkd; i++)
	{
		// Move each note over by one index.
		for (var j = 0; j < numNotesSaved-1; j++)
		{
			voiceChkd[i].notes[j].isEnd = voiceChkd[i].notes[j+1].isEnd;
			if (!voiceChkd[i].notes[j].isEnd)
			{
				voiceChkd[i].notes[j].isRest = voiceChkd[i].notes[j+1].isRest;
				voiceChkd[i].notes[j].origStartTick = voiceChkd[i].notes[j+1].origStartTick;
				voiceChkd[i].notes[j].thisNoteTicks = voiceChkd[i].notes[j+1].thisNoteTicks;
				voiceChkd[i].notes[j].leftoverTicks = voiceChkd[i].notes[j+1].leftoverTicks;
				if (!voiceChkd[i].notes[j].isRest)
				{
					voiceChkd[i].notes[j].note = voiceChkd[i].notes[j+1].note;
					
				} 
			}
		}
		// Make the cursor voiceChkd[i].cursorCurNote point to the note at index 1 (i.e. index StartCheckNote).
		if (!voiceChkd[i].notes[StartCheckNote].isEnd)
		{
			while (voiceChkd[i].cursorCurNote.tick() < voiceChkd[i].notes[StartCheckNote].origStartTick)
			{
				voiceChkd[i].cursorCurNote.next();
			}
		}
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
				voiceChkd[i].notes[nxtIdx].leftoverTicks = 0;
				if (!voiceChkd[i].notes[nxtIdx].isRest)
				{
					voiceChkd[i].notes[nxtIdx].note = voiceChkd[i].notes[curIdx].note;
				}
			} else {
				// This note/rest is the minimum length; read the next one.
				readNextNote(curScore, voiceChkd[i].cursor, selectionEnd, voiceChkd[i].notes[nxtIdx]);
			}

		}
	} // end for i < totalVoicesChkd

};

// ----------------------- isEndOfSelectionOrFile ------------------------------
function isEndOfSelectionOrFile(curScore, cursor, selectionEnd)
{
	if (cursor.eos()) { return true; }
	if (selectionEnd.eos())
	{
		// There was no selection; we are checking the whole file:
		return cursor.eos();
	}
	else
	{
		// There is a selection; compare with selectionEnd
		return (cursor.tick() >= selectionEnd.tick())
	}
};


// -------------------- FUNCTION:   readNextNote -----------------------------

function readNextNote(curScore, cursor, selectionEnd, myNote)
{
	// Reads the next note at the cursor into the myNote Object (i.e. myNote = voiceChkd[i].notes[j] for some i & j)
	var myRest = new Rest();
	var myChord = new Chord();

	if (!isEndOfSelectionOrFile(curScore, cursor, selectionEnd))
	{
		myNote.isEnd = false;
		myNote.origStartTick = cursor.tick();
		if (cursor.isChord())
		{
			myNote.isRest = false;
			var myChord = cursor.chord();
			myNote.thisNoteTicks = myChord.tickLen;
			myNote.leftoverTicks = 0;
			myNote.note = myChord.topNote();
			if (myChord.notes > 1)
			{
				// We are only checking one note per chord!
				var myText = new Text(curScore);
				myText.yOffset = -4.00;
				myText.xOffset = 0.00;
				myText.text = "MORE THAN ONE NOTE in staff " + (cursor.staff+1) + ", voice " + (cursor.voice+1);
				cursor.putStaffText(myText);
				myNote.note.color = new QColor(moreNotesPerChord);
			} // if more than one note in chord

			cursor.next();	
		} else {
			  myNote.isRest = true;
			  var tmpTicks = 0;
			  if(cursor.isRest())
			  {
				
				var myRest = cursor.rest();
				myNote.thisNoteTicks = myRest.tickLen;
				myNote.leftoverTicks = 0;
				cursor.next();
			  } else {
			    // this is neither a rest nor a note; treat it as a rest in the data structure for this plugin.
				tmpTicks = cursor.tick();
				cursor.next();
				myNote.thisNoteTicks = cursor.tick() - tmpTicks;
				myNote.leftoverTicks = 0;
			  }
			
				// Combine simultaneous rests into one rest in the data structure for this plugin 
				// (does not change rest length in score itself)
			
				var nextNoteIsRest = true;
				

				while (nextNoteIsRest)
				{
					if (!isEndOfSelectionOrFile(curScore, cursor, selectionEnd))
					{
						if (cursor.isRest())
						{
							myRest = cursor.rest();
							myNote.thisNoteTicks = myNote.thisNoteTicks + myRest.tickLen;
							cursor.next();
						} else {
							if (!cursor.isChord())
							{
								// This note is neither rest nor chord.  Treat it as a rest.
								tmpTicks = cursor.tick();
								cursor.next();
								myNote.thisNoteTicks = myNote.thisNoteTicks + cursor.tick() - tmpTicks;
							} else {
								nextNoteIsRest = false;
							}
						}
					} else {
						nextNoteIsRest = false;
					} // if not at end of selection
				} // while nextNoteIsRest

		} // if rest or chord
	}
	else
	{
		myNote.isEnd = true;
	} // end of if (!isEndOfSelectionOrFile(curScore, cursor, selectionEnd))
};

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
								voiceChkd[currVoiceChkd].cursor.staff = staff;
								voiceChkd[currVoiceChkd].cursorCurNote.staff = staff;
								voiceChkd[currVoiceChkd].cursor.goToSelectionStart();
								voiceChkd[currVoiceChkd].cursorCurNote.goToSelectionStart();
								voiceChkd[currVoiceChkd].cursor.staff = voiceChkd[currVoiceChkd].staff;
								voiceChkd[currVoiceChkd].cursorCurNote.staff = staff;
								voiceChkd[currVoiceChkd].cursor.voice = voiceChkd[currVoiceChkd].voice; // voice must be set after goto.
								voiceChkd[currVoiceChkd].cursorCurNote.voice = voiceChkd[currVoiceChkd].voice;
								if(voiceChkd[currVoiceChkd].cursorCurNote.eos())
								{
									voiceChkd[currVoiceChkd].cursorCurNote.rewind();
									voiceChkd[currVoiceChkd].cursor.rewind();
								}

								voiceChkd[currVoiceChkd].notes = new Array();
								for(var i=0; i<numNotesSaved; i++)
								{
								    voiceChkd[currVoiceChkd].notes[i] = new Object();
								} //end for i
								voiceChkd[currVoiceChkd].notes[0].isEnd = true;
								readNextNote(curScore, voiceChkd[currVoiceChkd].cursor, selectionEnd, voiceChkd[currVoiceChkd].notes[1]);
																
								currVoiceChkd=currVoiceChkd+1;
								cursor.goToSelectionEnd();
								stopChecking = true;
							}
						cursor.next();
						stopChecking = stopChecking || isEndOfSelectionOrFile(curScore, cursor, selectionEnd);
					} // end while
                  } //end for v
            } // end for staff
			totalVoicesChkd = currVoiceChkd;

			// Read two more notes per voice; Saved note 0 of the voice is blank; Saved note 1 is read, but lengths may be different.
			// Thus we must compare lengths, shift parts of notes that are too long into the next saved note, and read any extra notes.
			var curIdx = 1;
			for (var nxtIdx = curIdx + 1; nxtIdx < numNotesSaved; nxtIdx++)
			{
				makeNoteOneLenAndReadNext(curScore, selectionEnd, voiceChkd, totalVoicesChkd, curIdx, nxtIdx);
				curIdx++;
			}


			// While there are still notes to check, do all the required checks and move along one note.
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
					checkParallelPerfect5thsAndOctaves(curScore, voiceChkd, totalVoicesChkd, StartCheckNote, StartCheckNote+1)

					// Move along one note:
					moveAllNotesOverOneSpaceAndReadNext(curScore, selectionEnd, voiceChkd, totalVoicesChkd);
				}
			} // end while

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


