# MOOC Dropout
This repo holds code analyzing MOOC dropout data from EdX
using both RNN LSTM and an ensemble of other machine learning models.

## Ensemble code
Before running feature creation, write a deadline file with `deadlines.py`.
Feature creation is found in `ensemble_features.py`.
Change the course names at the top of the file to analyze other courses.

Run `clean_ensemble_input.py` to write cleaned csv's from features.
The course name at the top must be changed for each file.

Run `run_ensemble.py`. Set test and train courses with `testdata` and `traindata`.

With results of `run_ensemble.py` in memory, you can combine output results with `combine_results.py`.


## RNN LSTM code
To collect data in the proper format for RNN anaysis, import `collect_data_lstm.py`
and run `get_events_from_folder_name()` (code in comment at bottom to run for all)
and run `get_all_event_streams_instructor_paced()`
and it will write users for training to `'course_users/' + course_name + '_users.pickle'`
and users for testing to `'course_users/' + course_name + '_users_full.pickle'`.
Run the LSTM with `run_lstm.py`.
Calculate AUC scores with `run_lstm_util.calculate_auc_for_all()`
