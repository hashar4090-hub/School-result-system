/* =====================================================
   Student Result Card System  (HTML + CSS + jQuery)
   Sections: 1 Setup | 2 Helpers | 3 Form | 4 Result card
             5 Ranking | 6 Backup | 7 Events
   ===================================================== */
$(function () {

  /* ---------- 1. SETUP ---------- */
  var STORAGE_KEY = "result_system_students";
  var DEFAULT_SUBJECTS = ["English", "Urdu", "Mathematics", "Science", "Islamiyat"];
  var students = loadStudents();

  function loadStudents() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveStudents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }

  /* ---------- 2. HELPERS ---------- */
  function escapeHtml(text) {
    return $("<div>").text(text).html().replace(/"/g, "&quot;");
  }

  function getGrade(p) {
    if (p >= 90) return "A+";
    if (p >= 80) return "A";
    if (p >= 70) return "B";
    if (p >= 60) return "C";
    if (p >= 50) return "D";
    if (p >= 40) return "E";
    return "F";
  }

  function ordinal(n) {            // 1 -> 1st, 2 -> 2nd ...
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function groupKey(s) {           // students of same class + exam are ranked together
    return $.trim(s.cls).toLowerCase() + "|" + s.exam;
  }
  function groupLabel(s) {
    return ($.trim(s.cls) || "No class") + " - " + s.exam;
  }

  function sameGroup(s) {
    return $.grep(students, function (x) { return groupKey(x) === groupKey(s); });
  }

  // Position = number of students with higher percentage + 1 (equal % = same position)
  function getPosition(s) {
    var better = $.grep(sameGroup(s), function (x) {
      return Math.round(x.percentage * 100) > Math.round(s.percentage * 100);
    });
    return better.length + 1;
  }

  function isPassed(s) {
    var ok = true;
    $.each(s.subjects, function (i, sub) {
      if (sub.marks / s.maxMarks * 100 < s.passPercent) ok = false;
    });
    return ok;
  }

  function showToast(message) {
    var $t = $("#toast");
    $t.text(message).addClass("show");
    clearTimeout($t.data("timer"));
    $t.data("timer", setTimeout(function () { $t.removeClass("show"); }, 2500));
  }

  function showTab(name) {
    $(".panel").removeClass("active");
    $("#tab-" + name).addClass("active");
    $(".tab-btn").removeClass("active");
    $('.tab-btn[data-tab="' + name + '"]').addClass("active");
    window.scrollTo(0, 0);
  }
  function isMobile() { return window.matchMedia("(max-width: 800px)").matches; }

  /* ---------- 3. FORM ---------- */
  function addSubjectRow(name, marks) {
    var row =
      '<div class="subject-row">' +
        '<input type="text" class="subject-name" placeholder="Subject" value="' + escapeHtml(name || "") + '">' +
        '<input type="number" class="subject-marks" min="0" placeholder="Marks" value="' + (marks === undefined ? "" : marks) + '">' +
        '<button type="button" class="remove-subject" title="Remove">×</button>' +
      '</div>';
    $("#subjects").append(row);
  }

  function resetSubjects() {
    $("#subjects").empty();
    $.each(DEFAULT_SUBJECTS, function (i, name) { addSubjectRow(name); });
  }

  function resetForm() {
    $("#name, #roll, #cls, #father").val("");
    $("#error").text("");
    resetSubjects();
  }

  function generateResult() {
    $("#error").text("");
    var name = $.trim($("#name").val());
    var maxMarks = parseFloat($("#total").val());
    var passPercent = parseFloat($("#passMark").val());

    if (!name) return $("#error").text("Please enter the student name.");
    if (!(maxMarks > 0)) return $("#error").text("Total marks must be greater than 0.");

    var subjects = [], problem = "";
    $(".subject-row").each(function () {
      var subName = $.trim($(this).find(".subject-name").val());
      var raw = $(this).find(".subject-marks").val();
      if (!subName && raw === "") return;                       // empty row, skip
      if (!subName) { problem = "A subject name is missing."; return false; }
      var marks = parseFloat(raw);
      if (isNaN(marks) || marks < 0 || marks > maxMarks) {
        problem = 'Marks for "' + subName + '" must be between 0 and ' + maxMarks + ".";
        return false;
      }
      subjects.push({ name: subName, marks: marks });
    });
    if (problem) return $("#error").text(problem);
    if (!subjects.length) return $("#error").text("Add marks for at least one subject.");

    var obtained = 0;
    $.each(subjects, function (i, s) { obtained += s.marks; });
    var total = subjects.length * maxMarks;

    var student = {
      id: Date.now() + "-" + Math.floor(Math.random() * 1000),
      school: $("#school").val(), name: name, roll: $.trim($("#roll").val()),
      father: $("#father").val(), cls: $("#cls").val(), exam: $("#exam").val(),
      maxMarks: maxMarks, passPercent: passPercent, subjects: subjects,
      obtained: obtained, total: total, percentage: obtained / total * 100,
      date: new Date().toLocaleDateString()
    };

    // Same class + same roll no. = update old record (no duplicates)
    var message = "Student saved ✅", replaced = false;
    if (student.roll) {
      $.each(students, function (i, old) {
        if (groupKey(old) === groupKey(student) && old.roll.toLowerCase() === student.roll.toLowerCase()) {
          student.id = old.id; students[i] = student; replaced = true; return false;
        }
      });
    }
    if (replaced) message = "Roll no. already existed - record updated ✅";
    else students.push(student);

    saveStudents();
    renderCard(student);
    $("#group").data("want", groupKey(student));
    renderRanking();
    showToast(message);
    if (isMobile()) showTab("card");
  }

  /* ---------- 4. RESULT CARD ---------- */
  function renderCard(s) {
    var passed = isPassed(s), failedNames = [], rows = "";

    $.each(s.subjects, function (i, sub) {
      var p = sub.marks / s.maxMarks * 100, ok = p >= s.passPercent;
      if (!ok) failedNames.push(escapeHtml(sub.name));
      rows += "<tr><td>" + escapeHtml(sub.name) + "</td><td>" + s.maxMarks + "</td><td>" + sub.marks +
              "</td><td>" + getGrade(p) + '</td><td style="color:' + (ok ? "#1b8a4b" : "#c62f3a") +
              ';font-weight:600">' + (ok ? "Pass" : "Fail") + "</td></tr>";
    });

    var html =
      '<div class="card">' +
        "<h3>" + escapeHtml(s.school || "School") + "</h3>" +
        '<div class="sub-title">' + escapeHtml(s.exam) + " Result Card</div>" +
        '<div class="info">' +
          "<div><b>Name:</b> " + escapeHtml(s.name) + "</div>" +
          "<div><b>Roll no.:</b> " + escapeHtml(s.roll || "-") + "</div>" +
          "<div><b>Father:</b> " + escapeHtml(s.father || "-") + "</div>" +
          "<div><b>Class:</b> " + escapeHtml(s.cls || "-") + "</div>" +
        "</div>" +
        "<table><thead><tr><th>Subject</th><th>Total</th><th>Obtained</th><th>Grade</th><th>Status</th></tr></thead><tbody>" + rows + "</tbody></table>" +
        '<div class="summary">' +
          "<div>Total<strong>" + s.total + "</strong></div>" +
          "<div>Obtained<strong>" + s.obtained + "</strong></div>" +
          "<div>Percentage<strong>" + s.percentage.toFixed(2) + "%</strong></div>" +
          "<div>Grade<strong>" + getGrade(s.percentage) + "</strong></div>" +
          "<div>Position<strong>" + ordinal(getPosition(s)) + " / " + sameGroup(s).length + "</strong></div>" +
        "</div>" +
        '<div class="status ' + (passed ? "pass" : "fail") + '">' +
          (passed ? "Result: PASS" : "Result: FAIL (" + failedNames.join(", ") + ")") + "</div>" +
        '<div class="signs"><span>Class teacher</span><span>Principal</span></div>' +
        '<div class="issued">Issued on ' + escapeHtml(s.date) + "</div>" +
      "</div>";

    $("#card-output").html(html);
    $("#print-row").prop("hidden", false);
  }

  /* ---------- 5. RANKING ---------- */
  function renderRanking() {
    var $group = $("#group"), keys = [], options = "";
    var wanted = $group.data("want") || $group.val();

    $.each(students, function (i, s) {
      if ($.inArray(groupKey(s), keys) === -1) {
        keys.push(groupKey(s));
        options += '<option value="' + escapeHtml(groupKey(s)) + '">' + escapeHtml(groupLabel(s)) +
                   " (" + sameGroup(s).length + " students)</option>";
      }
    });
    $group.html(options);
    if ($.inArray(wanted, keys) > -1) $group.val(wanted);
    $group.removeData("want");

    var list = $.grep(students, function (s) { return groupKey(s) === $group.val(); });
    list.sort(function (a, b) {
      return Math.round(b.percentage * 100) - Math.round(a.percentage * 100) || a.name.localeCompare(b.name);
    });

    if (!list.length) {
      $("#topper").empty();
      $("#rank-list").html('<div class="empty">No students saved yet.</div>');
      return;
    }

    var winners = $.grep(list, function (s) { return getPosition(s) === 1; });
    var names = $.map(winners, function (s) { return escapeHtml(s.name) + " (Roll " + escapeHtml(s.roll || "-") + ")"; });
    $("#topper").html('<div class="topper">🥇 <b>1st position:</b> ' + names.join(", ") +
      " - <b>" + winners[0].percentage.toFixed(2) + "%</b></div>");

    var html = "";
    $.each(list, function (i, s) {
      var pos = getPosition(s), ok = isPassed(s);
      html +=
        '<div class="rank-item pos-' + pos + '" data-id="' + s.id + '">' +
          '<span class="badge">' + pos + "</span>" +
          '<div class="rank-info"><b>' + escapeHtml(s.name) + "</b><small>Roll " + escapeHtml(s.roll || "-") +
            (s.father ? " • s/o " + escapeHtml(s.father) : "") + "</small></div>" +
          '<div class="rank-score"><b>' + s.percentage.toFixed(1) + "%</b><small>" + s.obtained + "/" + s.total +
            " • " + getGrade(s.percentage) + ' • <span style="color:' + (ok ? "#1b8a4b" : "#c62f3a") + '">' + (ok ? "Pass" : "Fail") + "</span></small></div>" +
          '<button type="button" class="remove-subject delete-student" data-id="' + s.id + '">×</button>' +
        "</div>";
    });
    $("#rank-list").html(html);
  }

  function findStudent(id) {
    return $.grep(students, function (s) { return s.id === id; })[0];
  }

  /* ---------- 6. BACKUP / RESTORE ---------- */
  function exportBackup() {
    var blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" });
    var link = $("<a>").attr({ href: URL.createObjectURL(blob), download: "result-backup.json" }).appendTo("body");
    link[0].click();
    link.remove();
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result), added = 0;
        if (!$.isArray(data)) throw new Error("bad file");
        $.each(data, function (i, s) {
          if (s && s.id && s.name && s.subjects && !findStudent(s.id)) { students.push(s); added++; }
        });
        saveStudents(); renderRanking();
        showToast(added + " students restored ✅");
      } catch (e) { showToast("Invalid backup file"); }
    };
    reader.readAsText(file);
  }

  /* ---------- 7. EVENTS ---------- */
  $("#btn-add-subject").on("click", function () { addSubjectRow(); });
  $("#subjects").on("click", ".remove-subject", function () { $(this).closest(".subject-row").remove(); });
  $("#btn-generate").on("click", generateResult);
  $("#btn-reset").on("click", resetForm);
  $("#btn-print").on("click", function () { window.print(); });
  $(".tab-btn").on("click", function () { showTab($(this).data("tab")); });
  $("#group").on("change", renderRanking);

  $("#rank-list").on("click", ".delete-student", function (e) {
    e.stopPropagation();
    if (!confirm("Delete this student?")) return;
    var id = $(this).data("id");
    students = $.grep(students, function (s) { return s.id !== id; });
    saveStudents(); renderRanking();
  });
  $("#rank-list").on("click", ".rank-item", function () {
    var s = findStudent($(this).data("id"));
    if (!s) return;
    renderCard(s);
    if (isMobile()) showTab("card"); else $("#tab-card")[0].scrollIntoView({ behavior: "smooth" });
  });

  $("#btn-clear-class").on("click", function () {
    var key = $("#group").val();
    if (!key || !confirm("All students of this class will be deleted. Sure?")) return;
    students = $.grep(students, function (s) { return groupKey(s) !== key; });
    saveStudents(); renderRanking();
  });

  $("#btn-export").on("click", exportBackup);
  $("#btn-import").on("click", function () { $("#file-import").click(); });
  $("#file-import").on("change", function () {
    if (this.files[0]) importBackup(this.files[0]);
    $(this).val("");
  });

  /* ---------- START ---------- */
  resetSubjects();
  renderRanking();
});
