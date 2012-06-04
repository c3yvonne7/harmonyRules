Check Harmony Rules - check Soprano, Alto, Tennor, Bass for conformance to good harmony writing rules.
 
Current feature list:
 
Checks for parallel perfect 5ths and octaves, including consecutive 5ths and octaves in contrary motion, 
and unison to octave and octave to unison. (Note: different intervals that are enharmonically equivalent 
to a perfect 5th or octave are NOT detected).
 
Text is written to the score above any such intervals detected to notify the user of their existence, and 
the notes themselves are changed to red colour. Using the undo button will easily undo all changes.
 
Other checks may be added to this plugin at a later date.
 
Assumptions made about the score:
 Each voice should only have one note at a time (i.e. one note per museScore "chord"). If a voice contains 
 a chord of two or more notes, it is annotated as an error on the score.
 
To check your chords properly, each voice should play only one note at a time, as only the top note of each 
museScore chord in a single voice is checked.
 
If there is a selection, only the selected notes are checked. If nothing is selected, the entire score is 
checked.
 
Any number of voices may be checked at once, but if there are more than four voices, consecutive octaves 
may be more likely.
 
For the purposes of analysis, if different voices contain simultaneous notes of different lengths, the longer 
note(s) are treated as if they were split into shorter notes of the same length as the shortest simultaneous 
note. No notes on the score itself are changed (apart from the colour of the notes).
