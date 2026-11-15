<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Library of interface functions for mod_aitutor.
 *
 * @package    mod_aitutor
 * @copyright  2026 AI Tutor
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Declares which Moodle features this activity supports.
 *
 * @param string $feature FEATURE_* constant.
 * @return mixed True/false, a constant, or null if the feature is unknown.
 */
function aitutor_supports($feature) {
    switch ($feature) {
        case FEATURE_MOD_ARCHETYPE:
            return MOD_ARCHETYPE_OTHER;
        case FEATURE_MOD_PURPOSE:
            return MOD_PURPOSE_INTERACTIVECONTENT;
        case FEATURE_MOD_INTRO:
            return true;
        case FEATURE_SHOW_DESCRIPTION:
            return true;
        case FEATURE_COMPLETION_TRACKS_VIEWS:
            return true;
        case FEATURE_GROUPS:
            return false;
        case FEATURE_GROUPINGS:
            return false;
        case FEATURE_GRADE_HAS_GRADE:
            return false;
        case FEATURE_BACKUP_MOODLE2:
            return false; // Added in Phase 2 together with the data tables.
        default:
            return null;
    }
}

/**
 * Creates a new AI Tutor instance.
 *
 * @param stdClass $data Data from mod_form.
 * @param mod_aitutor_mod_form|null $mform The form.
 * @return int New instance id.
 */
function aitutor_add_instance(stdClass $data, $mform = null) {
    global $DB;

    $data->timecreated = time();
    $data->timemodified = $data->timecreated;

    return $DB->insert_record('aitutor', $data);
}

/**
 * Updates an AI Tutor instance.
 *
 * @param stdClass $data Data from mod_form.
 * @param mod_aitutor_mod_form|null $mform The form.
 * @return bool True on success.
 */
function aitutor_update_instance(stdClass $data, $mform = null) {
    global $DB;

    $data->timemodified = time();
    $data->id = $data->instance;

    return $DB->update_record('aitutor', $data);
}

/**
 * Deletes an AI Tutor instance and its dependent data.
 *
 * @param int $id Instance id.
 * @return bool True on success.
 */
function aitutor_delete_instance($id) {
    global $DB;

    if (!$DB->record_exists('aitutor', ['id' => $id])) {
        return false;
    }

    // Phase 2 will also delete conversations, messages, citations and quizzes here.
    $DB->delete_records('aitutor', ['id' => $id]);

    return true;
}

/**
 * Marks the activity as viewed: triggers the event and updates completion.
 *
 * @param stdClass $aitutor Instance record.
 * @param stdClass $course Course record.
 * @param cm_info|stdClass $cm Course module.
 * @param context_module $context Module context.
 * @return void
 */
function aitutor_view($aitutor, $course, $cm, $context) {
    $event = \mod_aitutor\event\course_module_viewed::create([
        'context' => $context,
        'objectid' => $aitutor->id,
    ]);
    $event->add_record_snapshot('course', $course);
    $event->add_record_snapshot('aitutor', $aitutor);
    $event->trigger();

    $completion = new completion_info($course);
    $completion->set_module_viewed($cm);
}
