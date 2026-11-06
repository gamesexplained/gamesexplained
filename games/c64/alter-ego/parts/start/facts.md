# Alter Ego — the start: verified technical facts

The start object: code and data the top level reads from MAP1 into the heap at `$8466` and calls through the stub there (`JMP $9348`). Addresses are this part's and link into its listing. *Live* means seen in the recorded sessions (`../../facts.md`, "Live tests").

## What it does

`run_new_or_resume_personality_setup` (`$8D5E`) is the whole of it:

1. The title's menu (`title_new_or_resume_menu_descriptor`, `$9456`): BEGIN A NEW GAME or RESUME A SAVED GAME. Resuming goes to the saved games on the disk (`resume_saved_game_menu`), and a life read back returns 1 to the top level; a new life goes on. *Live* (new-random, resume).
2. The name: "Please enter your name:" (`player_name_prompt_text`, `$8E11`), 16 characters at most, kept at `$82CB`. *Live* (new-random).
3. The PERSONALITY DEVELOPMENT PROFILE menu (`personality_mode_menu_descriptor`, `$9492`): SELECT MY OWN PERSONALITY, the questionnaire answered by hand; LET COMPUTER SELECT MY PERSONALITY, the 25 answers left to chance; or LET COMPUTER SELECT MY PERSONALITY THEN LET ME EXAMINE OR EDIT IT, left to chance and then shown to be changed. *Live*, each (answers, new-random, answers-edited).
4. The PHASES OF LIFE menu (`phase_of_life_menu_descriptor`, `$942E`): 1 Infancy, 2 Childhood, 3 Adolescence, 4 Young Adulthood, 5 Adulthood, 6 Middle Adulthood, 7 Old Age. The phase chosen goes to `$82BD`. *Live*, each (stage2 to stage7, and Infancy in the others).

It returns 0 for a new life, which the top level hands to the life object.

## The questionnaire

25 statements on seven pages, four to a page and one on the last (`run_personality_questionnaire_pages`, `$8FBB`; the statements' lines through `personality_question_line_ptrs_25x3`, `$9398`, three to a statement). Each page (`present_and_edit_questionnaire_page`, `$9078`) shows its statements with TRUE and FALSE under each and a star at the answer given. Up and down move the arrow between the statements, left and right between TRUE and FALSE, and fire answers and moves on. The answers are bytes, 1 TRUE and 2 FALSE, 0 not yet given. The last page's line at its foot begins the life once every statement is answered; while one is not, it goes back to the first page with one unanswered.

Left to chance (`randomize_questionnaire_answers`, `$9323`), each answer is the lowest bit of a read of the SID's noise (`$D41B`) plus 1.

## The scoring

`ScorePersonalityQuestionnaire` (`$8E29`) sets twelve of the shared words to 50 (the traits, at `$7F40-$7F56`) and `$7FA2` to 0, then applies each answer's record in question order: from the TRUE table at `$94AE` for an answer of 1, the FALSE table at `$971F` for anything else. Each table is 25 records of 25 bytes: a count, then triples of an operation, a shared word's number and a value. Operation 0 sets the word to the value; 1 moves it the value's per cent of the way to 100; 2 moves it the value's per cent of the way to 0; 3 and 4 add the value. Each per cent is taken in whole numbers, rounded down, before the next.

Sixty native runs of `$8E29` agree with an independent reading of the two tables on all 64 shared words: all TRUE, all FALSE, each of the 25 answers turned over from both, five mixed profiles, and answers of 0, 3 and 255. The tables leave Intelligence, Physical and Vocational at 50; question 22 answered TRUE alone sets word 49 to 1.

## The exit

`restore_saved_native_frame_and_return_vm_value` (`$936B`) returns to the top level from any depth through the frame the entry kept at `$9990`; nothing in the start object calls it.
