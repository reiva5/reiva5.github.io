serverUrl = 'http://programming.gemastik.ui.ac.id/2016/server-ujicoba-final.php';

var currentProblems = [];
var currentEntries = [];

var rowsMap = {};
var entriesMap = {};
var prevMap = {};
var nextMap = {};

function fetchScoreboard() {
    $.get(serverUrl, function(data) {
        refreshScoreboard(JSON.parse(data));
        setTimeout(fetchScoreboard, 2000);
    });
}

function problemsChanged(problems) {
    if (problems.length != currentProblems.length) {
        return true;
    }

    for (var i = 0; i < problems.length; i++) {
        if (problems[i] != currentProblems[i]) {
            return true;
        }
    }

    return false;
}

function refreshScoreboardProblems(problems) {
    $('.col-problem').remove();

    for (var i = 0; i < problems.length; i++) {
        var problem = problems[i];
        var header = $('<th>');
        header.prop('class', 'col-score col-problem');
        header.html(problem);
        $('#headers').append(header);
    }
}

function createRow(entry) {
    var tr = $('<tr>');
    tr.append($('<td class="col-rank">').html(entry['rank']));
    tr.append($('<td style="display:none">').html(entry['totalAccepted']));
    tr.append($('<td style="display:none">').html(entry['totalPenalties']));
    tr.append($('<td style="display:none">').html(entry['lastAcceptedPenalty']));
    tr.append($('<td>').html('<div class="col-team-name">' + entry['name'] + '</div><div class="col-team-institution">' + entry['school'] + '</div>'));
    tr.append($('<td class="col-score">').html('<div class="num-attempts">' + entry['totalAccepted'] + '</div><div class="num-penalty">' + entry['totalPenalties'] + '</div>'));

    for (var j = 0; j < entry['attemptsList'].length; j++) {
        var attempts = entry['attemptsList'][j];
        var penalty = entry['penaltyList'][j];
        var state = entry['problemStateList'][j];

        var attemptsToDisplay = penalty == 0 ? '_' : attempts;
        var penaltyToDisplay = state == 0 ? '_' : penalty;

        var color = '';
        if (state == 2) {
            color = 'first-ac';
        } else if (state == 1) {
            color = 'ac';
        } else if (attempts > 0) {
            color = 'wa';
        }

        tr.append($('<td class="col-score ' + color + '">').html('<div class="num-attempts">' + attemptsToDisplay + '</div><div class="num-penalty">' + penaltyToDisplay + '</div>'));
    }

    return tr;
}

function refreshScoreboardEntries(entries) {
    $('#entries').empty();

    rowsMap = {};
    entriesMap = {};
    prevMap = {};
    nextMap = {};

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var jid = entry['jid'];

        entriesMap[jid] = entry;
        if (i > 0) {
            prevMap[jid] = entries[i-1]['jid'];
        } else {
            prevMap[jid] = null;
        }
        if (i+1 < entries.length) {
            nextMap[jid] = entries[i+1]['jid'];
        } else {
            nextMap[jid] = null;
        }

        var tr = createRow(entry);
        rowsMap[jid] = tr;
        $('#entries').append(tr);
    }
}

function moveUp(jid) {
    var prevJid = prevMap[jid];
    var nextJid = nextMap[jid];

    prevMap[jid] = prevMap[prevJid];
    nextMap[jid] = prevJid;

    prevMap[prevJid] = jid;
    nextMap[prevJid] = nextJid;

    if (nextJid != null) {
        prevMap[nextJid] = prevJid;
    }
}

function compareWithoutTieBreaker(entry1, entry2) {
    if (entry1['totalAccepted'] != entry2['totalAccepted']) {
        return entry2['totalAccepted'] - entry1['totalAccepted'];
    }
    if (entry1['totalPenalties'] != entry2['totalPenalties']) {
        return entry1['totalPenalties'] - entry2['totalPenalties'];
    }

    return entry1['lastAcceptedPenalty'] - entry2['lastAcceptedPenalty'];
}

function compareWithTieBreaker(entry1, entry2) {
    var totalAttempts1 = 0;
    var totalAttempts2 = 0;

    for (var i = 0; i < entry1['attemptsList'].length; i++) {
        totalAttempts1 += entry1['attemptsList'][i];
        totalAttempts2 += entry2['attemptsList'][i];
    }

    if (totalAttempts1 == 0 && totalAttempts2 == 0) {
        return entry1['name'].localeCompare(entry2['name']);
    } else if (totalAttempts1 == 0) {
        return 1;
    } else if (totalAttempts2 == 0) {
        return -1;
    } else {
        return totalAttempts2 - totalAttempts1;
    }
}

function compare(entry1, entry2) {
    var withoutTieBreaker = compareWithoutTieBreaker(entry1, entry2);
    if (withoutTieBreaker != 0) {
       return withoutTieBreaker;
    }
    return compareWithTieBreaker(entry1, entry2);
}

function updateRanks() {
    var prevRank = -1;
    var prevEntry = {'name' : '', 'totalAccepted': -1, 'totalPenalties': -1, 'lastAcceptedPenalty' : -1};

    var curRank = 0;

    $('#entries').find('tr').each(function() {
        curRank++;

        var tdRank = $(this).find('td').first();
        var tdTotalAccepted = tdRank.next();
        var tdTotalPenalties = tdTotalAccepted.next();
        var tdLastAcceptedPenalty = tdTotalPenalties.next();
        var tdName = tdLastAcceptedPenalty.name();

        var curEntry = {'name': tdName.html(), 'totalAccepted': tdTotalAccepted.html(), 'totalPenalties': tdTotalPenalties.html(), 'lastAcceptedPenalty' : tdLastAcceptedPenalty.html()};

        if (compareWithoutTieBreaker(prevEntry, curEntry) == 0) {
            tdRank.html(prevRank);
        } else {
            tdRank.html(curRank);
            prevRank = curRank;
        }

        prevEntry = curEntry;
    });
}

function updateTimestamp(lastUpdateTime) {
    $('#lastUpdateTime').html(lastUpdateTime);
}

function refreshScoreboard(scoreboard) {
    var problems = scoreboard['problems'];
    var entries = scoreboard['entries'].sort(compare);

    if (problemsChanged(problems)) {
        refreshScoreboardProblems(problems);
    }

    refreshScoreboardEntries(entries);

    currentProblems = problems;
    currentEntries = entries;

    updateTimestamp(scoreboard['lastUpdateTime']);
}
