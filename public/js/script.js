function process() {
  let loading = document.getElementById('loading');
  loading.style.display = 'block';
  const input = document.getElementById('fileinput');

  const formData = new FormData();

  // Iterate over all selected files
  for (let i = 0; i < input.files.length; i++) {
    const file = input.files[i];
    formData.append('files', file);
  }

  let params = document.getElementById('params').value;
  formData.append('params', params);

  let url = 'http://localhost:3000/upload_files';
  fetch(url, {
    method: 'post',
    body: formData,
  })
  .then(response => response.json())
  .then((res) => {
    res.results.forEach((result, index) => {
      let batch_transcript = {transcript: '<Error transcribing>', words: []};
      let streaming_transcript = {transcript: '<Error transcribing>', words: []};
      if(result.batch_transcript.results){
        let batch_channels = result.batch_transcript.results.channels;
        batch_transcript = batch_channels[0].alternatives[0];

        let streaming_channels = result.streaming_transcript.results.channels;
        streaming_transcript = streaming_channels[0].alternatives[0];
      }

      const file = input.files[index];
      const audioUrl = URL.createObjectURL(file);

      addComparison(result.batch_transcript.filename, batch_transcript, streaming_transcript, audioUrl);
    });
    loading.style.display = 'none';
  })
  .catch((err) => {
    console.log('Error occurred', err);
    loading.style.display = 'none';
    alert('Error: ' + err);
  });
}

function addComparison(filename = '', batchTranscript = {}, streamingTranscript = {}, audioUrl = '') {
  const comparisonContainer = document.querySelector('#comparisonContainer tbody');

  const row = document.createElement('tr');

  const filenameCell = document.createElement('div');
  filenameCell.textContent = filename;

  const audioCell = document.createElement('div');
  let audioElement = null;
  if (audioUrl) {
    audioElement = document.createElement('audio');
    audioElement.controls = true;
    const sourceElement = document.createElement('source');
    sourceElement.src = audioUrl;
    sourceElement.type = 'audio/wav';
    audioElement.appendChild(sourceElement);
    audioCell.appendChild(audioElement);
  }

  const string1Cell = document.createElement('td');
  string1Cell.classList.add('string1-cell');

  const string2Cell = document.createElement('td');
  string2Cell.classList.add('string2-cell');

  const diffCell = document.createElement('td');
  const diffOutput = document.createElement('div');
  diffOutput.classList.add('diff');
  diffCell.appendChild(diffOutput);

  string1Cell.innerHTML = '';
  string2Cell.innerHTML = '';

  const dmp = new diff_match_patch();
  const diff = dmp.diff_main(batchTranscript.transcript, streamingTranscript.transcript);
  dmp.diff_cleanupSemantic(diff);

  let batchWords = batchTranscript.words;
  let streamingWords = streamingTranscript.words;

  let batchWordIndex = 0;
  let streamingWordIndex = 0;

  diff.forEach((part) => {
    const [operation, text] = part;

    let span1 = null;
    let span2 = null;
    let diffSpan = document.createElement('span');

    if (operation === -1) {
      span1 = createSpanWithTiming(batchWords, batchWordIndex, text, string1Cell);
      batchWordIndex += getWordCount(batchWords, batchWordIndex, text);

      span2 = addMissingPlaceholder(string2Cell);

      diffSpan.className = 'diff-del';
      diffSpan.textContent = text;
      diffSpan.dataset.startTime = span1.dataset.startTime;
      diffSpan.dataset.endTime = span1.dataset.endTime;
    } else if (operation === 1) {
      span2 = createSpanWithTiming(streamingWords, streamingWordIndex, text, string2Cell);
      streamingWordIndex += getWordCount(streamingWords, streamingWordIndex, text);

      span1 = addMissingPlaceholder(string1Cell);

      diffSpan.className = 'diff-ins';
      diffSpan.textContent = text;
      diffSpan.dataset.startTime = span2.dataset.startTime;
      diffSpan.dataset.endTime = span2.dataset.endTime;
    } else {
      span1 = createSpanWithTiming(batchWords, batchWordIndex, text, string1Cell);
      span2 = createSpanWithTiming(streamingWords, streamingWordIndex, text, string2Cell);
      batchWordIndex += getWordCount(batchWords, batchWordIndex, text);
      streamingWordIndex += getWordCount(streamingWords, streamingWordIndex, text);

      diffSpan.className = 'diff-match';
      diffSpan.textContent = text;
      diffSpan.dataset.startTime = span1.dataset.startTime;
      diffSpan.dataset.endTime = span2.dataset.endTime;
    }

    diffOutput.appendChild(diffSpan);

    diffSpan.addEventListener('mouseover', () => {
      highlightBothSpans(span1, span2);
    });
    diffSpan.addEventListener('mouseout', () => {
      removeHighlight(span1, span2);
    });
  });

  let filename_div = document.createElement('td');
  filename_div.appendChild(filenameCell);
  filename_div.appendChild(audioCell);
  row.appendChild(filename_div);
  row.appendChild(string1Cell);
  row.appendChild(string2Cell);
  row.appendChild(diffCell);

  comparisonContainer.appendChild(row);

  // if (audioElement) {
  //   audioElement.addEventListener('timeupdate', () => {
  //     const currentTime = audioElement.currentTime;
  //     highlightWordsByTime(string1Cell, currentTime);
  //     highlightWordsByTime(string2Cell, currentTime);
  //     highlightWordsByTime(diffOutput, currentTime);
  //   });
  // }
}

function createSpanWithTiming(words, index, text, cell) {
  const span = document.createElement('span');
  span.textContent = text;

  const wordCount = getWordCount(words, index, text);
  if (index < words.length) {
    span.dataset.startTime = words[index].start;
    span.dataset.endTime = words[Math.min(index + wordCount - 1, words.length - 1)]?.end;
  }

  cell.appendChild(span);
  return span;
}

function getWordCount(words, index, text) {
  return text.split(" ").length;
}

function highlightWordsByTime(cell, currentTime) {
  const spans = cell.querySelectorAll('span');
  spans.forEach(span => {
    const startTime = parseFloat(span.dataset.startTime);
    const endTime = parseFloat(span.dataset.endTime);
    if (currentTime >= startTime && currentTime <= endTime) {
      span.classList.add('highlight');
    } else {
      span.classList.remove('highlight');
    }
  });
}

function addMissingPlaceholder(cell) {
  const missingSpan = document.createElement('span');
  missingSpan.classList.add('missing-text-placeholder');
  missingSpan.textContent = ' ';
  cell.appendChild(missingSpan);
  return missingSpan;
}

function highlightBothSpans(span1, span2) {
  if (span1) span1.classList.add('highlight');
  if (span2) span2.classList.add('highlight');
}

function removeHighlight(span1, span2) {
  if (span1) span1.classList.remove('highlight');
  if (span2) span2.classList.remove('highlight');
}
