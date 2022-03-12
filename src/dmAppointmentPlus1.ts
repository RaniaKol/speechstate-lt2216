import { TIMEOUT } from "dns";
import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}
const kbRequest = (text: string) =>
    fetch(new Request(`https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`)).then(data => data.json())

const grammar: { [index: string]: { title?: string, day?: string, time?: string, meet?:string, celebrity?:string,username?:string } } = {
    "Lecture.": { title: "Dialogue systems lecture" },
    "Lunch.": { title: "Lunch at the canteen" },
    //days
    "Monday": { day: "Monday"},
    "Tuesday.": { day: "Tuesday"},
    "Wednesday.": { day: "Wednesday"},
    "Thursday.": { day: "Thursday"},
    "Friday": { day: "Friday" },
    
    //time
    "At 9": { time: "nine"},
    "At 10": { time: "ten" },
    "At 11": { time: "eleven"},
    "At 12": { time: "twelve"},
    "At 1:00": { time: "one"},
    "At 2:00": { time: "two"},
    "At 3:00": { time: "three"},
    "At 4:00": { time: "four"},
    "At 5:00": { time: "five"},
    "At 6:00": { time: "six"},
    "At 7:00": { time: "seven"},
    "At 8:00": { time: "eight"},
   
    "Create a meeting.":{ meet:"yes"},
    "Ask about someone.":{ celebrity:"no" },
    
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
                TTS_READY: 'Appointment',
                CLICK: 'Appointment'
            }
        },
        Help: { 
            initial: 'help_message',
            states: {
                help_message: {
                    entry: say("How can I help you?"),
                    on: { ENDSPEECH: '#root.dm.Appointment.hist' }, 
                }
            }
        },
        Appointment: {
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
                                target: 'menu',
                                cond: (context) => context.recResult[0].confidence > 0.6,
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
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
                        prompt2: {
                            entry: [say("Please, tell me your name."), 
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
            menu: {
                initial: 'prompt',
                entry: assign({counter: (context) => context.counter = 0}),
                on: {
                    RECOGNISED: [
                        {
                            target: '#root.dm.Help',
                            cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                        },
                        {
                            target: 'welcome',
                            cond: (context) => "meet" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence > 0.6,
                            actions: assign({ meet: (context) => grammar[context.recResult[0].utterance].meet!})
                        },
                        {
                            target: 'celebrity',
                            cond: (context) => "celebrity" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence > 0.6,
                            actions: assign({ celebrity: (context) => grammar[context.recResult[0].utterance].celebrity!})
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
                            cond: (context) => context.counter === 3,
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
                        entry: [say("Would you like to create a meeting or ask about someone?"), assign({counter: (context) => context.counter + 1})],
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
            celebrity: {
                initial: 'prompt0',
                entry:assign({counter:(context)=>context.counter}),
                on: {
                    RECOGNISED: [
                        {
                            target: '#root.dm.Help',
                            cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                        },
                        {
                            target:'celeb_info',
                            cond: (context) => context.recResult[0].confidence > 0.6,
                                    actions: assign({ celebrity: (context) => context.recResult[0].utterance })
                                },
                        
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
                            target: '.prompt2',
                            cond: (context) => context.counter === 2,
                        },
                        {
                            target: '#root.dm.init',
                            cond: (context) => context.counter === 3,
                        },
                    ],
                },
                states: {
                    prompt0: {
                        entry: say("For whom do you want to know?"),
                        on: { ENDSPEECH: 'ask' }
                    },
                    prompt1: {
                        entry: say("Who are you searching for?"),
                        on: { ENDSPEECH: 'ask' }
                    },
                    prompt2: {
                        entry: say("For whom do you want information?"),
                        on: { ENDSPEECH: 'ask' }
                    },
                    ask: {
                        entry: send('LISTEN'),
                    }
                }
            },
                celeb_info: {
                    invoke: {
                        id: 'famouSId',
                        src: (context, event) => kbRequest(context.celebrity),
                        onDone: {
                            target:  'meeting_with_celeb',
                            actions: [assign({ famouS: (context, event) => event.data.AbstractText }),(context, event) => console.log(context, event)
                            ]
                        },
                        onError: {
                            target: 'celebrity',
                        },
                    },
                },
                meeting_with_celeb: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value:  `Ok,Some information about ${context.celebrity}, ${context.famouS}.`
                    })),
                    on: { ENDSPEECH: 'you' }
                },
                
                you: {
                    initial: 'prompt0',
                    entry: assign({counter: (context) => context.counter = 0}),
                    on: {
                        RECOGNISED: [
                            {target: '#root.dm.Help',
                            cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                        },
                            
                            {target: 'date',
                            cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes',
                            actions: assign({ title: (context) => ` ${context.celebrity}` })
                            },
                            {target: 'meeting',
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    },
                    states: {
                        prompt0: {
                            entry: [say('Do you want to meet the celecrity}'), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [say("Do you want to create this meeting?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [say("Do you want to create a meeting with the celebrity?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, what did you say?"),
                            on: { ENDSPEECH: 'ask' }
                        }
                    }
                },
                welcome: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Ok!`,
                    })),
                    on: { ENDSPEECH: 'meeting' }
                },
                meeting: {
                    initial: 'prompt0',
                    entry: assign({counter: (context) => context.counter = 0}),
                    on: {
                        RECOGNISED: [
                            {target: '#root.dm.Help',
                                cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                            },
                            {target: 'day',
                            cond: (context) => "title" in (grammar[context.recResult[0].utterance] || {}),
                            actions: assign((context) => { return { title: grammar[context.recResult[0].utterance].title! }}),
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    },
                    states: {
                        prompt0: {
                            entry: [say("What is your meeting about?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [say("Tell me about your meeting"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [say("What should I call your meeting?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I don't know that. Could you repeat?"),
                            on: { ENDSPEECH: 'ask' }
                        }
                    }
                },
                day: {
                    initial: "prompt0",
                    on: {
                        RECOGNISED: [{target: '#root.dm.Help',
                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                    },
                    {
                            cond: (context) => "day" in (grammar[context.recResult[0].utterance] || {}),
                            actions: assign((context) => { return { day: grammar[context.recResult[0].utterance].day! } }),
                            target: "whole_day"
                        },
                            { target: ".nomatch" }],
        
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    },
                    states: {
                        prompt0: {
                            entry: [say("On which day is it?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [say("On which day will this meeting take place?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [say("Please tell me the day of this meeting."), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, what day did you say?"),
                            on: { ENDSPEECH: 'ask' }
                        }
                    }
                },
                whole_day: {
                    initial: "prompt0",
                    entry: assign({counter: (context) => context.counter = 0}),
                    on: {
                        RECOGNISED: [
                            {target: '#root.dm.Help',
                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                    },
                            { target: 'confirmation_whole_day', cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes'},
                            { target: 'time', cond: (context) =>  "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no' },
                        
                            { target: ".nomatch" }],
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    },
                    states: {
                        prompt0: {
                            entry: [say("Will it take the whole day?"), assign({counter: (context) => context.counter + 1}), ],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [say("Will the meeting take the whole day?"), assign({counter: (context) => context.counter + 1}), ],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [say("Will the meeting take the whole day"), assign({counter: (context) => context.counter + 1}), ],
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I don't know what it is. Tell me something I know."),
                            on: { ENDSPEECH: 'ask' }
                        }
                    }
                },
                date: {
                    initial: "prompt0",
                    on: {
                        RECOGNISED: [{target: '#root.dm.Help',
                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                    },
                    {
                            cond: (context) => "day" in (grammar[context.recResult[0].utterance] || {}),
                            actions: assign((context) => { return { day: grammar[context.recResult[0].utterance].day! } }),
                            target: "all_day"
                        },
                            { target: ".nomatch" }],
        
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    },
                    states: {
                        prompt0: {
                            entry: [say("On which day is your meeting?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [say("On which day is your meeting?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [say("Could you tell which day is your meeting"), assign({counter: (context) => context.counter + 1})],
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
                all_day: {
                    initial: "prompt0",
                    entry: assign({counter: (context) => context.counter = 0}),
                    on: {
                        RECOGNISED: [
                            {target: '#root.dm.Help',
                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                    },
                            { target: 'confirmation_all_day', cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes'},
                            { target: 'time', cond: (context) =>  "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no' },
                        
                            { target: ".nomatch" }],
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    },
                    states: {
                        prompt0: {
                            entry: [say("Will it take the whole day?"), assign({counter: (context) => context.counter + 1}), ],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [say("Will the meeting take the whole day?"), assign({counter: (context) => context.counter + 1}), ],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [say("Will the meeting last the whole day?"), assign({counter: (context) => context.counter + 1}), ],
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
                time: {
                    initial: "prompt0",
                    entry: assign({counter: (context) => context.counter = 0}),
                    on: {
                        RECOGNISED: [{
                            
                                target: '#root.dm.Help',
                                cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                            },
                            {
                            cond: (context) => "time" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence > 0.6,
                            actions: assign((context) => { return { time: grammar[context.recResult[0].utterance].time! } }),
                            target: "confirmation_with_time"
                        },
                            { target: ".nomatch" }],
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    
                    },
                    states: {
                        prompt0: {
                            entry: [say("What time is your meeting?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [say("Could you tell me what time is your meeting?"), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [say("Please tell me what time is your meeting."), assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, what time did you say?"),
                            on: { ENDSPEECH: 'ask' }
                        }
                    }
                },
                confirmation_whole_day: {
                    initial: "prompt0",
                    entry: assign({counter: (context) => context.counter = 0}),
                    on: {
                        RECOGNISED: [{
                            target: '#root.dm.Help',
                                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                             target: 'meeting_created', 
                             cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes' },
                             { target: 'time', 
                             cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no'},
                            { target: ".nomatch" }],
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    
                    },
                    states: {
                        prompt0: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Do you want me to create a meeting titled ${context.title} on ${context.day}?`,
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Should I create a meeting called ${context.title} on ${context.day}?`,
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Do you want me to create a meeting titled ${context.title} on ${context.day}?`,
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
        
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I don't understand that."),
                            on: { ENDSPEECH: 'ask' }
                        }
                    }
                },
                confirmation_all_day: {
                    initial: "prompt0",
                    entry: assign({counter: (context) => context.counter = 0}),
                    on: {
                        RECOGNISED: [{
                            target: '#root.dm.Help',
                                        cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                             target: 'meeting_created', 
                             cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes' },
                             { target: 'time', 
                             cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no'},
                            { target: ".nomatch" }],
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    
                    },
                    states: {
                        prompt0: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Do you want me to create a meeting with ${context.celebrity} on ${context.day}?`,
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Should I create a meeting with ${context.celebrity} on ${context.day}?`,
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Do you want me to create a meeting with ${context.celebrity} on ${context.day}?`,
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
        
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I don't understand that."),
                            on: { ENDSPEECH: 'ask' }
                        }
                    }
                },
                confirmation_with_time: {
                    initial: "prompt0",
                    on: {
                        RECOGNISED: [{
                            target: '#root.dm.Help',
                            cond: (context) => "help" in (yes_nogrammar[context.recResult[0].utterance] || {}),
                                    },
                                {
                             target: 'meeting_created', 
                             cond: (context) =>"yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes'},
                             { target: 'meeting', 
                             cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no'},
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
                                target: '.prompt2',
                                cond: (context) => context.counter === 2,
                            },
                            {
                                target: '#root.dm.init',
                                cond: (context) => context.counter === 3,
                            },
                        ],
                    
        
                    },
                    states: {
                        prompt0: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Do you want me to create a meeting titled ${context.title} on ${context.day} at ${context.time}?`
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt1: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Should I create a meeting titled ${context.title} on ${context.day} at ${context.time}?`
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: [send((context) => ({
                                type: 'SPEAK',
                                value: `Please tell me if you want me to create a meeting titled ${context.title} on ${context.day} at ${context.time}.`
                            })),
                            assign({counter: (context) => context.counter + 1})],
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I don't understand. Could you repeat?"),
                            on: { ENDSPEECH: 'ask' }
                        }
                    }
                },
                meeting_created: {
                    initial: "prompt",
                    states: {
                        prompt: { entry: say("Ok.Your meeting has been created!") }
                    }
                },
            },
        }
    }
    })
                