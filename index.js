import 'dotenv/config'
import express from "express";
import pkg from "@deepgram/sdk";
import { createServer } from "http";
import fs from 'fs';
import cors from 'cors';

import multer from 'multer'

function getUrlParamsToJson(paramsString) {
  const params = new URLSearchParams(paramsString);
  const jsonObject = {};

  params.forEach((value, key) => {
      jsonObject[key] = value;
  });

  return jsonObject;
}

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  },
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
})

const upload = multer({ storage })

const { Deepgram } = pkg;

let deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);

const app = express();
app.use(cors())
app.use(express.static("public/"));

app.post('/upload_files', upload.any('file'), async (req, res) => {
  console.log('/upload_files', new Date().toLocaleString());
  
  console.log(req.body);
  console.log(req.files);

  let params = req.body.params;
  let batch_options = getUrlParamsToJson(params);
  let streaming_options = {...batch_options, chunker: "streaming", parser: "streaming"};
  
  try {
    const batch_audioSource = {
        stream: fs.createReadStream(req.files[0].path),
        mimetype: "wav",
    };
    const batch_response = await deepgram.transcription.preRecorded(batch_audioSource, batch_options);

    const streaming_audioSource = {
      stream: fs.createReadStream(req.files[0].path),
      mimetype: "wav",
  };
    const streaming_response = await deepgram.transcription.preRecorded(streaming_audioSource, streaming_options);
    
    setTimeout(()=>{fs.unlink(req.files[0].path, (evt)=>{console.log('Unlinked file ')})}, 1)
    res.send({ 
      message: 'Successfully uploaded files', 
      batch_transcript: batch_response, 
      streaming_transcript: streaming_response 
    })
  } catch(err){
    console.log(err);
    res.status(500).send({ err: 'Unable to process audio file' })
  }
})

console.log('Starting Server on Port 3000');
const httpServer = createServer(app);
httpServer.listen(3000);
console.log('Running');