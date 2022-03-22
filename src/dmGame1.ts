import { TIMEOUT } from "dns";
import { Context } from "microsoft-cognitiveservices-speech-sdk/distrib/lib/src/common.speech/RecognizerConfig";
import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}
const kbRequest = (text: string) =>
    fetch(new Request(`https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`)).then(data => data.json())

const grammar: { [index: string]: { question1?: string, question2?: string, question3?: string, question4?:string, question5?:string,username?:string } } = {
    "Future.": { question1: "Correct" },
    "The future.": { question1: "Correct" },
    "Promise.": { question2: "Well done!"},
    "A promise." : { question2: "Well done!"},
    "Secret." : { question3: "That's correct."},
    "A secret." : { question3: "That's correct."},
    "My name." : { question4: "Correct"},
    "Your name." : { question4: "Correct"},
    "Mirror." : { question5: "Correct"},
    "A mirror." : { question5: "Correct"}


    
    
}

const yes_nogrammar: { [index: string]: { yes_no?: string, help?: string} } = {
    "Yes.": { yes_no: "yes"},
    "Of course.": { yes_no: "yes"},
    "Sure.": { yes_no: "yes"},
    "Absolutely.": { yes_no: "yes"},
    "No.": { yes_no: "no"},
    "No way.": { yes_no: "no"},
    "Of course not.": { yes_no: "no"},
    "Absolutely not.": { yes_no: "no"},
    "Help me.":{help: "help"},
    "Help.":{help:"help"},
    "I would like to help me":{help:"help"}
}
export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'idle',
    
    states: {
        idle: {
            on: {
                CLICK: 'init'
            }
        },
        init: {
            on: {
                TTS_READY: 'Hello',
                CLICK: 'Hello'
            }
        },
        Help: { 
            initial: 'help_message',
            states: {
                help_message: {
                    entry: say("Welcome to the riddles. It is a mini game with 5 questions. In the first three questions you have two chances to answer if you make a mistake. If you want to win you have to answer all the questions correctly. Good luck!  "),
                    on: { ENDSPEECH: '#root.dm.Hello.hist' }, 
                }
            }
        },
        Hello: {
            initial: 'Hej',
            states: {
                hist: {
                    type: 'history',
                },
                Hej: {
                    initial: 'prompt0',
                    entry: assign({counter: (context) => context.counter = 0}),
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.Help',
                                cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {})
                            },
                            {
                                target: 'begin',
                                
                                actions: assign({ username: (context) => context.recResult[0].utterance }) 
                            },
                            {
                                target: '.nomatch'
                            }
                            ],
                        TIMEOUT: [
                            {
                                target: '.prompt0',
                                cond: (context) => context.counter === 0,
                            },
                            {
                                target: '.prompt1',
                                cond: (context) => context.counter === 1,
                            },
                            
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 2,
                            },
                        ],
                        },
                    states: {
                        hist: {
                            type: 'history',
                        },
                        prompt0: {
                            entry: [say("What is your name?"), 
                                    assign({counter: (context) => context.counter +1})],
                            on: { ENDSPEECH: 'ask' }
                            },
                        prompt1: {
                            entry: [say("could you say your name?"), 
                                    assign({counter: (context) => context.counter +1})],
                            on: { ENDSPEECH: 'ask' }
                            },
                        ask: {
                                entry: send('LISTEN'),
                            },
                        nomatch: {
                            entry: say("Sorry, could you repeat?"),
                            on: { ENDSPEECH: 'ask' }
                            }
                        }
                    },
            begin: {
                initial: 'prompt',
                entry: assign({counter: (context) => context.counter = 0}),
                on: {
                    RECOGNISED: [
                        {
                            target: '#root.dm.Help',
                            cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                        },
                        {
                            target: 'game_starts',
                            cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes',
                            
                        },
                        {
                            target: 'Hej',
                            cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no',
                            
                        },
                        {
                            target: '.nomatch'
                        }
                        ],
                    TIMEOUT: [
                        {
                            target: '.prompt',
                            cond: (context) => context.counter === 0,
                        },
                        {
                            target: '#root.dm.init',
                            cond: (context) => context.counter === 1,
                        },
                    ],
                },
                states: {
                    prompt: {
                        entry: send((context) => ({
                            type: 'SPEAK',
                            value: `Hi ${context.username}`
                        })),
                        on: { ENDSPEECH: 'ask' },
                    },
                    ask: {
                        entry: [say("Would you like to play a game?"), assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'yo'}
                    },
                    yo: {
                        entry: send('LISTEN'),
                    },
                    nomatch: {
                        entry: say("Sorry, I didn't understand that."),
                        on: { ENDSPEECH: 'ask' }
                    }
                }
            },
            game_starts: {
                initial: 'prompt0',
                entry: assign({counter: (context) => context.counter = 0}),
                on: {
                    RECOGNISED: [
                        {target: '#root.dm.Help',
                            cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                        },
                        {target: 'question2',
                        cond: (context) => "question1" in (grammar[context.recResult[0].utterance] || {}),
                        actions: assign((context) => { return { question1: grammar[context.recResult[0].utterance].question1! }}),
                    },
                        
                        {target: '.nomatch',
                        cond: (context) => context.counter === 1},
                        {target: '.nomatch1',
                        cond: (context) => context.counter === 2}

                        ],
                    TIMEOUT: [
                        {
                            target: '.prompt0',
                            cond: (context) => context.counter === 0,
                        },
                        {
                            target: '.prompt1',
                            cond: (context) => context.counter === 1,
                        },
                        
                        {
                            target: '#root.dm.init',
                            cond: (context) => context.counter === 2,
                        },
                    ],
                },
                states: {
                    prompt0: {
                        entry: [say("Ok, let's start with the first question. What is always in front of you but can't be seen?"), assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'ask1' }
                    },
                    prompt1: {
                        entry: [say("What is always in front of you but can't be seen?"), assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'ask2' }
                        
                    },
                    
                    ask1: {
                        entry: send('LISTEN'),
                        
                    },
                    
                    ask2: {
                        entry: send('LISTEN'),
                        
                    },
                    
                    nomatch: {
                        entry: [say("Sorry, your answer is wrong! You have one more chance."), assign({counter: (context) => context.counter })],
                        on: { ENDSPEECH: 'prompt1' }
                    },
                    nomatch1:{
                        entry: [say("Your answer is wrong!"), assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'loose' }
                    },
                    loose: {
                         entry: say("sorry, you have lost!"),
                         
                        }   
                }
            },
            question2: {
                initial: "prompt0",
                on: {
                    RECOGNISED: [{
                        target: '#root.dm.Help',
                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                                },
                            {
                         target: 'question3', 
                         cond: (context) =>"question2" in (grammar[context.recResult[0].utterance] || {}),
                         actions: assign((context) => { return { question2: grammar[context.recResult[0].utterance].question2! }})},
                          
                         
                         {target: '.nomatch',
                         cond: (context) => context.counter === 1},
                         {target: '.nomatch1',
                         cond: (context) => context.counter === 2}
                    ],
                    TIMEOUT: [
                        {
                            target: '.prompt0',
                            cond: (context) => context.counter === 0,
                        },
                        {
                            target: '.prompt1',
                            cond: (context) => context.counter === 1,
                        },
                        
                        {
                            target: '#root.dm.init',
                            cond: (context) => context.counter === 2,
                        },
                    ],
                
    
                },
                states: {
                    prompt0: {
                        entry: [send((context) => ({
                            type: 'SPEAK',
                            value: `You have answered ${context.question1} the first question. Let's move on on the second. What can you break, even if you never pick it up or touch it?`
                        })),
                        assign({counter: (context) => context.counter })],
                        on: { ENDSPEECH: 'ask1' }
                    },
                    prompt1: {
                        entry: [send((context) => ({
                            type: 'SPEAK',
                            value: ` What can you break, even if you never pick it up or touch it?`
                        })),
                        assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'ask2' }
                    },
                    
                    ask1: {
                        entry: send('LISTEN'),
                    },
                    ask2: {
                        entry: send('LISTEN'),
                        
                    },
                    nomatch: {
                        entry: [say("Sorry you have answered incorrectly! Try again!"), assign({counter: (context) => context.counter })],
                        on: { ENDSPEECH: 'prompt1' }
                    },
                    nomatch1: {
                        entry: [say("You have answered incorrectly!"), assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'loose1' }
                    },
                    
                    loose1: {
                         entry: say("sorry, you have lost!"),
                            
                        }
                    }
            },
            question3: {
                initial: "prompt0",
                on: {
                    RECOGNISED: [{
                        target: '#root.dm.Help',
                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                                },
                            {
                         target: 'question4', 
                         cond: (context) =>"question3" in (grammar[context.recResult[0].utterance] || {}),
                         actions: assign((context) => { return { question3: grammar[context.recResult[0].utterance].question3! }})},
                          
                         
                         {target: '.nomatch',
                         cond: (context) => context.counter === 1},
                         {target: '.nomatch1',
                         cond: (context) => context.counter === 2}
                    ],
                    TIMEOUT: [
                        {
                            target: '.prompt0',
                            cond: (context) => context.counter === 0,
                        },
                        {
                            target: '.prompt1',
                            cond: (context) => context.counter === 1,
                        },
                        
                        {
                            target: '#root.dm.init',
                            cond: (context) => context.counter === 2,
                        },
                    ],
                
    
                },
                states: {
                    prompt0: {
                        entry: [send((context) => ({
                            type: 'SPEAK',
                            value: ` ${context.question2}. Question3. If you've got me, you want to share me; if you share me, you haven't kept me. What am I?`
                        })),
                        assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'ask1' }
                    },
                    prompt1: {
                        entry: [send((context) => ({
                            type: 'SPEAK',
                            value: ` If you've got me, you want to share me; if you share me, you haven't kept me. What am I?`
                        })),
                        assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'ask2' }
                    },
                    
                    ask1: {
                        entry: send('LISTEN'),
                    },

                    ask2: {
                        entry: send('LISTEN'),
                    },
                    nomatch: {
                        entry: [say("The answer is wrong! Listen to the question one more time."), assign({counter: (context) => context.counter })],
                        on: { ENDSPEECH: 'prompt1' }
                    },
                    
                    nomatch1: {
                            entry: [say("The answer is wrong!"), assign({counter: (context) => context.counter })],
                            on: { ENDSPEECH: 'loose2' }
                    },
                    loose2: {
                        entry: say("sorry, you have lost!"),
                        


                    }
                }
            },
            question4: {
                initial: "prompt",
                on: {
                    RECOGNISED: [{
                        target: '#root.dm.Help',
                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                                },
                            {
                         target: 'question5', 
                         cond: (context) =>"question4" in (grammar[context.recResult[0].utterance] || {}),
                         actions: assign((context) => { return { question4: grammar[context.recResult[0].utterance].question4! }})},
                    
                        { target: ".nomatch" }
                    ]
                },
                   
                states: {
                    prompt: {
                        entry: send((context) => ({
                            type: "SPEAK",
                            value: `${context.question3} .For the rest two answers you have only one chance to answer correct. So, let's move on. Question 4. It belongs to you, but other people use it more than you do. What is it?`
                        })),
                        on: { ENDSPEECH: "ask" }
                    },
                    ask: {
                        entry:send('LISTEN')
                    },
                    nomatch: {
                        entry: say("Sorry you have lost."),
                        
                    }
                }
            },
            question5: {
                initial: "prompt",
                on: {
                    RECOGNISED: [{
                        target: '#root.dm.Help',
                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                                },
                            {
                         target: 'Win', 
                         cond: (context) =>"question5" in (grammar[context.recResult[0].utterance] || {}),
                         actions: assign((context) => { return { question5: grammar[context.recResult[0].utterance].question5! }})},
                          
                         
                        { target: ".nomatch" }
                    ],
                    
                
    
                },
                states: {
                    prompt: {
                        entry: [send((context) => ({
                            type: 'SPEAK',
                            value: `You have answered ${context.question4} the fourth question. And now it's time for the last one. If you drop me I'm sure to crack, but give me a smile and I'll always smile back. What am I?`
                        })),
                        assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'ask' }
                    },
                    prompt1: {
                        entry: [send((context) => ({
                            type: 'SPEAK',
                            value: ` What can you break, even if you never pick it up or touch it?`
                        })),
                        assign({counter: (context) => context.counter + 1})],
                        on: { ENDSPEECH: 'ask' }
                    },
                    
                        
                    
                    ask: {
                        entry: send('LISTEN'),
                    },
                    nomatch: {
                        entry: say("Sorry you have answered incorrectly! You have lost!"),
                        
                    },
            
            
                    
                
            }
        },
           
            Win: {
                initial: "prompt",
                states: {
                    prompt: { entry: say("Congratulations, you have won!") }}}}}}})