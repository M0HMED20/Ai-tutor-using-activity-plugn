<?php
require(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

$id = required_param('id', PARAM_INT);

[$course, $cm] = get_course_and_cm_from_cmid($id, 'aitutor');

$aitutor = $DB->get_record(
    'aitutor',
    ['id' => $cm->instance],
    '*',
    MUST_EXIST
);

require_login($course, true, $cm);

$context = context_module::instance($cm->id);

require_capability('mod/aitutor:view', $context);

aitutor_view($aitutor, $course, $cm, $context);

$PAGE->set_url('/mod/aitutor/view.php', ['id' => $cm->id]);
$PAGE->set_title(format_string($aitutor->name));
$PAGE->set_heading(format_string($course->fullname));

// Load CSS.
$PAGE->requires->css(
    new moodle_url('/mod/aitutor/frontend/style.css')
);

// Load JavaScript.
$PAGE->requires->js(
    new moodle_url('/mod/aitutor/frontend/script.js')
);
// Moodle header.
echo $OUTPUT->header();

if (has_capability('mod/aitutor:use', $context)) {

    $frontend = __DIR__ . '/frontend/index.html';

    if (file_exists($frontend)) {
        echo file_get_contents($frontend);
    } else {
        echo $OUTPUT->notification(
            'Frontend file not found.',
            'error'
        );
    }

} else {

    echo $OUTPUT->notification(
        get_string('nopermissionuse', 'mod_aitutor'),
        'warning'
    );

}

// Moodle footer.
echo $OUTPUT->footer();
