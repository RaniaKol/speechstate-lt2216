/// <reference types="react-scripts" />

declare module 'react-speech-kit';
declare module 'web-speech-cognitive-services/lib/SpeechServices/TextToSpeech';
declare module 'web-speech-cognitive-services/lib/SpeechServices/SpeechToText';

interface Hypothesis {
    "utterance": string;
    "confidence": number
}

interface MySpeechSynthesisUtterance extends SpeechSynthesisUtterance {
    new(s: string);
}

interface MySpeechRecognition extends SpeechRecognition {
    new(s: string);
}

interface SDSContext {
    asr: SpeechRecognition;
    tts: SpeechSynthesis;
    voice: SpeechSynthesisVoice;
    ttsUtterance: MySpeechSynthesisUtterance;
    recResult: Hypothesis[];
    hapticInput: string;
    nluData: any;
    ttsAgenda: string;
    sessionId: string;
    tdmAll: any;
    tdmUtterance: string;
    tdmPassivity: number;
    tdmActions: any;
    tdmVisualOutputInfo: any;
    tdmExpectedAlternatives: any;
    azureAuthorizationToken: string;
    audioCtx: any;

    title: string;
    category: string;
    joke: string;
    weekday: string;
    day: string;
    time: string;
    yes_nogrammar: string;
    yes_no: string;
    username: string;
    celebrity: string;
    meet: string;
    famouS: string;
    date: string;
    intentid: string;
    intent: string;
    counter: number;
    intenDId: string;
    
    
    
    question1: string;
    question2: string;
    question3: string;
    question4: string;
    question5: string;
   
    
}

type SDSEvent =
    | { type: 'TTS_READY' }
    | { type: 'TTS_ERROR' }
    | { type: 'CLICK' }
    | { type: 'SELECT', value: any }
    | { type: 'SHOW_ALTERNATIVES' }
    | { type: 'STARTSPEECH' }
    | { type: 'RECOGNISED' }
    | { type: 'ASRRESULT', value: Hypothesis[] }
    | { type: 'ENDSPEECH' }
    | { type: 'LISTEN' }
    | { type: 'TIMEOUT' }
    | { type: 'DONE' }
    | { type: 'SPEAK', value: string };
