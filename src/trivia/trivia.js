//Possible screens
// START, IN_QUESTION, FINISHED

var current_screen = 'START'
var current_streak = 0
var streak_to_win = 3
var current_question
var time_per_question_s = 15
var question_timeleft_s = time_per_question_s;
var question_timer = setInterval(update_progress_bar, 1000);
var finish_timeout
var time_before_reset_ms = 60000
var question_list = questions.questions

document.addEventListener('keydown', (event) => {
    console.log(`current screen: ${current_screen}`)
    console.log(`current streak: ${current_streak}`)
    var key = event.key;
    var code = event.code;
    if (key == 'r' && current_screen == 'START') {
        window.location = "/"
    }
    else if (key == 'r' && current_screen != 'START'){
        reset_game()
    }
    else if (key == 's' && current_screen == 'START') {
        current_screen = 'IN_QUESTION'
        new_question_screen()
    }
    else if (current_screen == 'IN_QUESTION') {
        if (current_question.answer == 'a' && key == 'a') {
            current_streak += 1
            new_question_screen()
        }
        else if (current_question.answer == 'b' && key == 'b') {
            current_streak += 1
            new_question_screen()
        }
        else if (current_question.answer == 'c' && key == 'c') {
            current_streak += 1
            new_question_screen()
        }
        else if (current_question.answer == 'd' && key == 'd') {
            current_streak += 1
            new_question_screen()
        }
        else if (current_streak >= streak_to_win) {
            you_win_screen()
        }
        else {
            you_lost_screen()
        }
    }
}, false);

function reset_game() {
    console.log("reset game")
    current_screen = 'START'
    current_streak = 0
    start_screen()
    location.reload()
}

function reset_by_time() {
    clearTimeout(finish_timeout)
    reset_game()
}

function start_screen() {
    document.body.innerHTML = `
    <div id="start-text">Presiona "Start" para jugar</div>
    <video id="background-video" autoplay muted loop> <source src="assets/start_scene_720.mp4" type="video/mp4"> </video>
    `
}

function new_question_screen() {
    if (current_streak >= streak_to_win) {
        you_win_screen()
        return
    }
    reset_question_timer()
    console.log("new_question_screen")

    // Hide Start text
    hide("start-text")

    // Load new question
    var current_question_index = Math.floor(Math.random() * question_list.length)
    current_question = question_list[current_question_index]
    question_list.splice(current_question_index, 1)

    // Write new question text
    var questionText = document.getElementById("question-text")
    questionText.innerHTML = `
    ${current_question.text}
    <br><br><br><br>
    ${current_question.options}
    `

    // Show new question
    show("question-text")

    // Add progress bar
    show("progress-bar")
}

function you_lost_screen() {
    console.log("you lost screen")
    hide("progress-bar")
    hide("question-text")
    finish_timeout = setTimeout(reset_by_time, time_before_reset_ms)
    show('lose-video')
    loadVideo('lose-video')
    current_screen = 'FINISHED'
    current_streak = 0
}

function time_out_screen() {
    hide("idle-video")
    hide("progress-bar")
    hide("question-text")
    show("lose-video")
    finish_timeout = setTimeout(reset_by_time, time_before_reset_ms)
    current_screen = 'FINISHED'
    current_streak = 0
}

function you_win_screen() {
    finish_timeout = setTimeout(reset_by_time, time_before_reset_ms)
    show('win-video')
    loadVideo('win-video')
    hide("question-text")
    hide("progress-bar")
    current_screen = 'FINISHED'
    current_streak = 0
}

function update_progress_bar() {
    if (question_timeleft_s <= 0) {
        time_out_screen();
        reset_question_timer()
    }
    if (current_screen == 'IN_QUESTION') {
        document.getElementById("progress-bar").value = question_timeleft_s;
        question_timeleft_s -= 1;
    }
}

function reset_question_timer() {
    question_timeleft_s = time_per_question_s
}

function hide(id) {
    document.getElementById(id)
        .setAttribute('style', 'display: none;')
}

function show(id) {
    document.getElementById(id)
        .setAttribute('style', '')
}

function loadVideo(id) {
    document.getElementById(id).load();
}