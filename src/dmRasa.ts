import { TIMEOUT } from "dns";
import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}
const rasaurl = 'https://intent-app1.herokuapp.com/model/parse'
const nluRequest = (text: string) =>
    fetch(new Request(rasaurl, {
        method: 'POST',
        body: `{"text": "${text}"}`
    }))
        .then(data => data.json());



const grammar: { [index: string]: { intent?: string } } = {
    "Switch of the light": { intent: "switch of the light" },
    "Turn on the light": { intent: "turn on the light" },
    "Clean the room": { intent: "clean the room" },
    "Light up the room": { intent: "light up the room" },
    "Vacuum": { intent: "vacuum" },
    "Cook": { intent: "cook" },
    "Throw the trash away": { intent: "throw the trash away" },
    
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
                    entry: say("How can I help you?"),
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
                                cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: 'Welcome',
                                
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
                            entry: [say("Could you say your name?"), 
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
                    Welcome: {
                        entry: send((context) => ({
                            type: 'SPEAK',
                            value:  `Welcome ${context.username}!`
                        })),
                        on: { ENDSPEECH: 'yo' }
                    },
                    
                    yo: {
                        initial: 'prompt0',
                        entry: assign({counter: (context) => context.counter = 0}),
                        on: {
                            RECOGNISED: [
                                {target: '#root.dm.Help',
                                cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                            },
                                
                            {
                                actions: assign({ username: (context) => context.recResult[0].utterance }),
                                target: "intent_info"
                            },
                                { target: ".nomatch" }
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
                                entry: [say("What can I do for you?"), assign({counter: (context) => context.counter + 1})],
                                on: { ENDSPEECH: 'ask' }
                            },
                            prompt1: {
                                entry: [say("Tell what to do."), assign({counter: (context) => context.counter + 1})],
                                on: { ENDSPEECH: 'ask' }
                            },
                            
                            ask: {
                                entry: send('LISTEN'),
                            },
                            nomatch: {
                                entry: say("Sorry, I don't understand."),
                                on: { ENDSPEECH: 'ask' }
                            }
                        }
                    },
                    
            
                    intent_info: {
                        invoke: {
                            id: 'intenDId',
                            src: (context, event) => nluRequest(context.recResult[0].utterance),
                            onDone: {target: 'todo',
                            
                            actions: [assign((context, event) => { return {title: event.data.intent.name }}),
			                (context:SDSContext, event:any) => console.log(event.data)]
                            },
                            onError: {
                                target: 'yo',
                                
                            
                            }
                        }
                    },
                    todo: {
                        entry: send((context) => ({
                            type: 'SPEAK',
                            value:  ` Ok! i will do this ${context.title} for you.`
                        })),
                        on: { ENDSPEECH: 'ask' }
                    },
                    
                    ask: {
                        initial: 'prompt0',
                        entry: assign({counter: (context) => context.counter = 0}),
                        on: {
                            RECOGNISED: [
                                {target: '#root.dm.Help',
                                cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                            },
                                
                                {target: 'done',
                                cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes',
                                actions: assign({ title: (context) => ` ${context.intent}` })
                                },
                                {target: 'yo',
                                cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no',
                                },
                                {target: '.nomatch'}
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
                                entry: [say('Do you want me to do this for you?'), assign({counter: (context) => context.counter + 1})],
                                on: { ENDSPEECH: 'ask' }
                            },
                            prompt1: {
                                entry: [say("Are you sure that you want me to do this?"), assign({counter: (context) => context.counter + 1})],
                                on: { ENDSPEECH: 'ask' }
                            },
                            
                            ask: {
                                entry: send('LISTEN'),
                            },
                            nomatch: {
                                entry: say("Sorry, I didn't understand?"),
                                on: { ENDSPEECH: 'ask' }
                            }
                        }
                    },
                    done: {
                        initial: "prompt",
                        states: {
                            prompt: { entry: say("Ok. I'm starting!") }
                        }
                    },
                },
            }
        }
        })
            
           