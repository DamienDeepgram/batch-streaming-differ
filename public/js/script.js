function addComparison(string1 = '', string2 = '') {
  if(string1 == ''){
    string1 = document.getElementById('string1').value;
  }
  if(string2 == ''){
    string2 = document.getElementById('string2').value;
  }
  const comparisonContainer = document.querySelector('#comparisonContainer tbody');

  // Create table row
  const row = document.createElement('tr');

  // Create cells for string1, string2, and diff
  const string1Cell = document.createElement('td');
  string1Cell.textContent = string1;

  const string2Cell = document.createElement('td');
  string2Cell.textContent = string2;

  const diffCell = document.createElement('td');
  const diffOutput = document.createElement('div');
  diffOutput.classList.add('diff');
  diffCell.appendChild(diffOutput);

  // Generate diff
  const dmp = new diff_match_patch();
  const diff = dmp.diff_main(string1, string2);
  dmp.diff_cleanupSemantic(diff);
  const diffHtml = dmp.diff_prettyHtml(diff);
  diffOutput.innerHTML = diffHtml;

  // Append cells to row
  row.appendChild(string1Cell);
  row.appendChild(string2Cell);
  row.appendChild(diffCell);

  // Append row to the table
  comparisonContainer.appendChild(row);
}

function process(){
  let loading = document.getElementById('loading');
  loading.style.display = 'block';
  var input = document.getElementById('fileinput');

  const formData = new FormData()
  formData.append('files', input.files[0])

  let params = document.getElementById('params').value;
  formData.append('params', params)

  let url = `http://localhost:3000/upload_files`;
  fetch(url, {
      method: 'post',
      body: formData,
  })
  .then(response => response.json())
  .then((res) => {
    let batch_channels = res.batch_transcript.results.channels;
    let batch_transcript = batch_channels[0].alternatives[0].transcript;
    console.log('batch_transcript', batch_transcript);

    let streaming_channels = res.streaming_transcript.results.channels;
    let streaming_transcript = streaming_channels[0].alternatives[0].transcript;
    console.log('streaming_transcript', streaming_transcript);

    addComparison(batch_transcript, streaming_transcript);
    loading.style.display = 'none';
  })
  .catch((err) => {
    console.log('Error occurred', err);
    loading.style.display = 'none';
    alert('Error: ' + err);
  })
}

// Initialize with example comparisons
window.onload = function() {
  // addComparison(
  //     "The quick brown fox jumps over the lazy dog.",
  //     "The quick brown fox leaps over the lazy dog."
  // );
  // addComparison(
  //     "A journey of a thousand miles begins with a single step.",
  //     "A journey of a thousand miles starts with a single step."
  // );
}