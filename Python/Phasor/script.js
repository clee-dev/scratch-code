var PHASES = ["L1", "L2", "L3"];
var ALL_CURRENT_CHANNELS = ["I1", "I2", "I3", "I4", "I5", "I6", "I7", "I8", "I9", "I10", "I11", "I12", "I13", "I14"];

// basic/advanced and the auto checkbox are independent, both just toggle classes on body
function update_body_class() {
  var mode = document.querySelector('input[name="mode"]:checked').value;
  var auto_on = document.getElementById("auto-toggle").checked;
  var cls = "mode-" + mode;
  if (auto_on) {
    cls += " auto-on";
  }
  document.body.className = cls;
}

var mode_radios = document.querySelectorAll('input[name="mode"]');
for (var m = 0; m < mode_radios.length; m++) {
  mode_radios[m].addEventListener("change", update_body_class);
}
document.getElementById("auto-toggle").addEventListener("change", update_body_class);

// setup files don't always have every section, this avoids crashing on a missing one
function get_section(config, name) {
  return config[name] || {};
}

function wrap_abs(angle) {
  var norm_ang = angle;
  while (norm_ang > 360 || norm_ang < 0) {
    if (norm_ang < 0) {
      norm_ang += 360;
    } else if (norm_ang >= 360) {
      norm_ang -= 360;
    }
  }
  return norm_ang;
}

function wrap_diff(angle) {
  var diff_ang = angle;
  while (diff_ang > 180 || diff_ang < -180) {
    if (diff_ang < -180) {
      diff_ang += 360;
    } else if (diff_ang >= 180) {
      diff_ang -= 360;
    }
  }
  return diff_ang;
}

var EXPECTED_ANGLE = { L1: 0, L2: 240, L3: 120 };

function undo_existing_corrections(connections, inversions, displayed_angles) {
  var raw_physical = {};

  for (var software_ch in displayed_angles) {
    var angle = displayed_angles[software_ch];
    if (angle === "" || angle === null || angle === undefined) {
      continue;
    }
    angle = parseFloat(angle);
    if (isNaN(angle)) {
      continue;
    }

    var physical_terminal = connections[software_ch];
    if (!physical_terminal) {
      continue;
    }

    var was_inverted = inversions ? inversions[software_ch] : false;
    if (was_inverted) {
      angle = wrap_abs(angle + 180);
    }

    raw_physical[physical_terminal] = angle;
  }

  return raw_physical;
}

// plain recursive permutations, only ever called with 3 items here
function permutations(arr) {
  if (arr.length <= 1) {
    return [arr];
  }
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    var rest = arr.slice(0, i).concat(arr.slice(i + 1));
    var rest_perms = permutations(rest);
    for (var j = 0; j < rest_perms.length; j++) {
      result.push([arr[i]].concat(rest_perms[j]));
    }
  }
  return result;
}

// all 8 true/false combos for 3 slots
function invert_combos() {
  var combos = [];
  for (var i = 0; i < 8; i++) {
    combos.push([!!(i & 1), !!(i & 2), !!(i & 4)]);
  }
  return combos;
}

// channels: array of 3 software channel/phase names
// raw_by_terminal: physical terminal -> raw angle (from undo_existing_corrections)
// expected_by_channel: software channel -> expected angle
// allow_invert: false for voltage (no invert flag exists for voltage), true for current
// tries all 6 terminal assignments x (8 or 1) invert combos, picks lowest total error
function brute_force_solver(channels, raw_by_terminal, expected_by_channel, allow_invert) {
  var terminals = Object.keys(raw_by_terminal);
  var terminal_perms = permutations(terminals);
  var combos = allow_invert ? invert_combos() : [[false, false, false]];

  var best = null;

  for (var p = 0; p < terminal_perms.length; p++) {
    var perm = terminal_perms[p];

    for (var c = 0; c < combos.length; c++) {
      var invert_flags = combos[c];
      var total_error = 0;
      var mapping = {};
      var inverts = {};
      var corrected = {};

      for (var i = 0; i < channels.length; i++) {
        var channel = channels[i];
        var terminal = perm[i];
        var angle = raw_by_terminal[terminal];

        if (invert_flags[i]) {
          angle = wrap_abs(angle + 180);
        }

        var expected = expected_by_channel[channel];
        var diff = wrap_diff(angle - expected);
        total_error += Math.abs(diff);

        mapping[channel] = terminal;
        inverts[channel] = invert_flags[i];
        corrected[channel] = angle;
      }

      if (best === null || total_error < best.error) {
        best = { mapping: mapping, inverts: inverts, corrected: corrected, error: total_error };
      }
    }
  }

  return best;
}

function terminal_options(list, selected) {
  var html = "";
  for (var i = 0; i < list.length; i++) {
    var v = list[i];
    html += '<option value="' + v + '"' + (v === selected ? " selected" : "") + ">" + v + "</option>";
  }
  return html;
}

// one row builder for voltage, reused whether typed manually or filled from a setup file
function add_voltage_row(phase, connected_to) {
  var table = document.getElementById("voltage-table");
  var tr = document.createElement("tr");
  tr.dataset.phase = phase;
  tr.innerHTML =
    "<td>" + phase + "</td>" +
    '<td class="adv-col"><select class="v-terminal">' + terminal_options(PHASES, connected_to) + "</select></td>" +
    '<td><input type="number" class="v-angle" step="0.1"></td>';
  table.appendChild(tr);
}

// same idea for current, one builder used everywhere a current row shows up
function add_current_row(channel, phase, connected_to, inverted) {
  var table = document.getElementById("current-table");
  var tr = document.createElement("tr");
  tr.dataset.channel = channel;
  tr.innerHTML =
    "<td>" + channel + "</td>" +
    '<td><select class="c-phase">' + terminal_options(PHASES, phase) + "</select></td>" +
    '<td class="adv-col"><select class="c-terminal">' + terminal_options(ALL_CURRENT_CHANNELS, connected_to) + "</select></td>" +
    '<td class="adv-col"><input type="checkbox" class="c-invert"' + (inverted ? " checked" : "") + "></td>" +
    '<td><input type="number" class="c-angle" step="0.1"></td>';
  table.appendChild(tr);
}

function clear_table(table_id) {
  var table = document.getElementById(table_id);
  var rows = table.querySelectorAll("tr[data-phase], tr[data-channel]");
  for (var i = 0; i < rows.length; i++) {
    rows[i].remove();
  }
}

// default rows, manual entry starting point
add_voltage_row("L1", "L1");
add_voltage_row("L2", "L2");
add_voltage_row("L3", "L3");
add_current_row("I1", "L1", "I1", false);
add_current_row("I2", "L2", "I2", false);
add_current_row("I3", "L3", "I3", false);

// quick and dirty ini parser, sections in [brackets], key=value, ; comments
function parse_ini(text) {
  var sections = {};
  var current_section = null;
  var lines = text.split(/\r?\n/);

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line === "" || line.indexOf(";") === 0 || line.indexOf("#") === 0) {
      continue;
    }
    if (line.indexOf("[") === 0 && line.indexOf("]") === line.length - 1) {
      current_section = line.slice(1, -1);
      sections[current_section] = {};
      continue;
    }
    var eq = line.indexOf("=");
    if (eq === -1 || current_section === null) {
      continue;
    }
    var key = line.slice(0, eq).trim();
    var value = line.slice(eq + 1).trim();
    if (value.indexOf('"') === 0 && value.lastIndexOf('"') === value.length - 1) {
      value = value.slice(1, -1);
    }
    sections[current_section][key] = value;
  }

  return sections;
}

document.getElementById("setup-file-input").addEventListener("change", function (e) {
  var file = e.target.files[0];
  var status_el = document.getElementById("setup-file-status");
  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.onload = function () {
    var config = parse_ini(reader.result);
    var dual_voltage_section = get_section(config, "Dual_Voltage_Measurement");
    var adjust_section = get_section(config, "Adjust_Phase_Connections");
    var metering_section = get_section(config, "Energy_Metering_Setup");

    if (dual_voltage_section["Dual_Voltage_Mode"] === "ON") {
      status_el.textContent = "dual voltage mode is on, not supported yet, enter angles manually instead";
      return;
    }

    if (Object.keys(adjust_section).length === 0) {
      status_el.textContent = "couldn't find [Adjust_Phase_Connections] in this file, is it a real PQube3 Setup.ini?";
      return;
    }

    clear_table("voltage-table");
    for (var i = 0; i < PHASES.length; i++) {
      var phase = PHASES[i];
      var connected_to = adjust_section["Voltage_" + phase + "_Input_Connected_To"] || phase;
      add_voltage_row(phase, connected_to);
    }

    clear_table("current-table");
    var found = 0;
    for (var n = 1; n <= 14; n++) {
      var association = metering_section["Current_I" + n + "_associated_to_Voltage"];
      if (association === "L1" || association === "L2" || association === "L3") {
        var channel = "I" + n;
        var connected_to2 = adjust_section["Current_I" + n + "_Input_Connected_To"] || channel;
        var inverted = adjust_section["Invert_Current_I" + n + "_Channel"] === "ON";
        add_current_row(channel, association, connected_to2, inverted);
        found += 1;
      }
    }

    status_el.textContent = "loaded " + file.name + ", found " + found + " active channels";
  };
  reader.readAsText(file);
});

// dont know the real pqube endpoint for this yet, fill it in before using
document.getElementById("fetch-btn").addEventListener("click", function () {
  var ip = document.getElementById("device-ip").value.trim();
  var status_el = document.getElementById("fetch-status");
  if (!ip) {
    status_el.textContent = "enter a device ip first";
    return;
  }

  status_el.textContent = "fetching...";

  fetch("http://" + ip + "/REPLACE_WITH_REAL_ENDPOINT")
    .then(function (res) {
      if (!res.ok) {
        throw new Error("http " + res.status);
      }
      return res.json();
    })
    .then(function (angles) {
      var v_rows = document.querySelectorAll("#voltage-table tr[data-phase]");
      for (var i = 0; i < v_rows.length; i++) {
        var phase = v_rows[i].dataset.phase;
        if (angles[phase] !== undefined) {
          v_rows[i].querySelector(".v-angle").value = angles[phase];
        }
      }
      var c_rows = document.querySelectorAll("#current-table tr[data-channel]");
      for (var j = 0; j < c_rows.length; j++) {
        var channel = c_rows[j].dataset.channel;
        if (angles[channel] !== undefined) {
          c_rows[j].querySelector(".c-angle").value = angles[channel];
        }
      }
      status_el.textContent = "filled in below";
    })
    .catch(function (err) {
      status_el.textContent = "couldnt fetch (" + err.message + "), enter manually";
    });
});

document.getElementById("calculate-btn").addEventListener("click", function () {
  var ini_lines = "";

  // voltage: undo existing corrections, then solve for the right swap (no invert for voltage)
  var voltage_connections = {};
  var voltage_angles = {};
  var v_rows = document.querySelectorAll("#voltage-table tr[data-phase]");
  for (var i = 0; i < v_rows.length; i++) {
    var phase = v_rows[i].dataset.phase;
    voltage_connections[phase] = v_rows[i].querySelector(".v-terminal").value;
    voltage_angles[phase] = v_rows[i].querySelector(".v-angle").value;
  }
  var raw_voltage = undo_existing_corrections(voltage_connections, null, voltage_angles);

  var voltage_status_el = document.getElementById("voltage-solver-status");
  var voltage_results = document.getElementById("voltage-results-table");
  var old_v_rows = voltage_results.querySelectorAll("tr.result-row");
  for (var k = 0; k < old_v_rows.length; k++) {
    old_v_rows[k].remove();
  }

  if (Object.keys(raw_voltage).length !== 3) {
    voltage_status_el.textContent = "enter displayed angles for all 3 voltage phases first";
  } else {
    var voltage_best = brute_force_solver(PHASES, raw_voltage, EXPECTED_ANGLE, false);
    voltage_status_el.textContent = "best mapping found, total error " + voltage_best.error.toFixed(1) + " deg";

    for (var vp = 0; vp < PHASES.length; vp++) {
      var vphase = PHASES[vp];
      voltage_results.innerHTML +=
        '<tr class="result-row"><td>' + vphase + "</td><td>" + voltage_best.mapping[vphase] + "</td><td>" +
        voltage_best.corrected[vphase].toFixed(1) + "</td></tr>";
      ini_lines += "Voltage_" + vphase + "_Input_Connected_To = " + voltage_best.mapping[vphase] + "\n";
    }
  }

  // current: undo existing corrections to get raw physical angles, then solve
  var channels = [];
  var current_connections = {};
  var current_inversions = {};
  var current_angles = {};
  var expected_by_channel = {};
  var c_rows = document.querySelectorAll("#current-table tr[data-channel]");

  var status_el = document.getElementById("solver-status");
  if (c_rows.length !== 3) {
    status_el.textContent = "solver needs exactly 3 current channels, you have " + c_rows.length;
    document.getElementById("ini-output").textContent = ini_lines;
    return;
  }

  for (var j = 0; j < c_rows.length; j++) {
    var channel = c_rows[j].dataset.channel;
    channels.push(channel);
    current_connections[channel] = c_rows[j].querySelector(".c-terminal").value;
    current_inversions[channel] = c_rows[j].querySelector(".c-invert").checked;
    current_angles[channel] = c_rows[j].querySelector(".c-angle").value;
    var cphase = c_rows[j].querySelector(".c-phase").value;
    expected_by_channel[channel] = EXPECTED_ANGLE[cphase];
  }

  var raw_current = undo_existing_corrections(current_connections, current_inversions, current_angles);

  if (Object.keys(raw_current).length !== 3) {
    status_el.textContent = "enter displayed angles for all 3 channels first";
    document.getElementById("ini-output").textContent = ini_lines;
    return;
  }

  var best = brute_force_solver(channels, raw_current, expected_by_channel, true);
  status_el.textContent = "best mapping found, total error " + best.error.toFixed(1) + " deg";

  var current_results = document.getElementById("current-results-table");
  var old_c_rows = current_results.querySelectorAll("tr.result-row");
  for (var mrow = 0; mrow < old_c_rows.length; mrow++) {
    old_c_rows[mrow].remove();
  }

  for (var n = 0; n < channels.length; n++) {
    var ch = channels[n];
    var terminal_n = ch.slice(1);
    var invert_val = best.inverts[ch] ? "ON" : "OFF";

    current_results.innerHTML +=
      "<tr class=\"result-row\"><td>" + ch + "</td><td>" + best.mapping[ch] + "</td><td>" +
      (best.inverts[ch] ? "yes" : "no") + "</td><td>" + best.corrected[ch].toFixed(1) + "</td></tr>";

    ini_lines += "Current_I" + terminal_n + "_Input_Connected_To = " + best.mapping[ch] + "\n";
    ini_lines += "Invert_Current_I" + terminal_n + "_Channel = " + invert_val + "\n";
  }

  document.getElementById("ini-output").textContent = ini_lines;
});
