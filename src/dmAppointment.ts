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

const yes_nogrammar: { [index: string]: { yes_no?: string } } = {
    "Yes.": { yes_no: "yes"},
    "Of course.": { yes_no: "yes"},
    "Sure.": { yes_no: "yes"},
    "Absolutely.": { yes_no: "yes"},
    "No.": { yes_no: "no"},
    "No way.": { yes_no: "no"},
    "Of course not.": { yes_no: "no"},
    "Absolutely not.": { yes_no: "no"},
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
                TTS_READY: 'Hej',
                CLICK: 'Hej'
            }
        },

        Hej: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'welcome',
                        actions: assign({ username: (context) => context.recResult[0].utterance })
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("What's your name?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                }
            }
        },

        welcome: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `Hello, ${context.username}!`
            })),
            on: { ENDSPEECH: 'meeting' }
        },

        meeting: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {target: 'ask_about',
                    cond: (context) => "meet" in (grammar[context.recResult[0].utterance] || {}) && grammar[context.recResult[0].utterance].meet === 'yes',
                    },
                    {target: 'celebrity',
                    cond: (context) => "celebrity" in (grammar[context.recResult[0].utterance] || {}) && grammar[context.recResult[0].utterance].celebrity === 'no',
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Would you like to create a meeting or ask about someone?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't understand that."),
                    on: { ENDSPEECH: 'prompt' }
                }
            }
        },

        celebrity: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'celeb_info',
                        actions: assign({ celebrity: (context) => context.recResult[0].utterance })
                    },
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("For whom do you want to know?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                }
            }
        },

        celeb_info: {
            entry: send((context) => ({
                type: 'SPEAK',
                value: `Ok, you are looking information for ${context.celebrity}.`
            })),
            on: { ENDSPEECH: 'ask' }
        },

        ask: {
            invoke: {
                id: 'famouSId',
                src: (context, event) => kbRequest(context.celebrity),
                onDone: {target: 'meeting_with_celeb',
                    actions: [assign({ famouS: (context, event) => event.data.AbstractText }),(context, event) => console.log(context, event)
                    ]
                },
                onError: {
                    target: 'celebrity'
                }
            }
        },

        meeting_with_celeb: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {target: 'date',
                    cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes',
                    actions: assign({ title: (context) => ` ${context.celebrity}` })
                    },
                    {target: 'meeting',
                    cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no',
                    },
                    {target: '.nomatch'}
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Some information about ${context.celebrity}, ${context.famouS}. Do you want to meet ${context.celebrity}?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't understand. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },
        date: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "day" in (grammar[context.recResult[0].utterance] || {}),
                    actions: assign((context) => { return { day: grammar[context.recResult[0].utterance].day! } }),
                    target: "all_day"
                },
                    { target: ".nomatch" }],

                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Ok, Meeting with ${context.celebrity}. On which day is your meeting?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: send('LISTEN')
                },
                nomatch: {
                    entry: say("Sorry, could you repeat the day?"),
                    on: { ENDSPEECH: "ask" }
                }
            }
        },
        all_day: {
            initial: "prompt",
            on: {
                RECOGNISED: [
                    { target: 'confirmation_whole_day', 
                    cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes'},
                    { target: 'time', 
                    cond: (context) =>  "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no' },
                
                    { target: ".nomatch" }],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Ok, meeting with ${context.celebrity} on ${context.day}. Will it take all day?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry:send('LISTEN') 
                },
                nomatch: {
                    entry: say("Sorry I didn't understand. Will it take the whole day?"),
                    on: { ENDSPEECH: "ask" }
                }
            }
        },
        
        ask_about: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "title" in (grammar[context.recResult[0].utterance] || {}),
                    actions: assign((context) => { return { title: grammar[context.recResult[0].utterance].title! }}),
                    target: "day"

                },
                { target: ".nomatch" },
            ],
            TIMEOUT: '.prompt',
            },
            states: {
                prompt: {
                    entry: say("What is it about?"),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: send('LISTEN')
                },
                nomatch: {
                    entry: say("Sorry, I don't know what it is. Tell me something I know."),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        day: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "day" in (grammar[context.recResult[0].utterance] || {}),
                    actions: assign((context) => { return { day: grammar[context.recResult[0].utterance].day! } }),
                    target: "whole_day"
                },
                    { target: ".nomatch" }],

                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Ok, Meeting for ${context.title}. On which day is your meeting?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: send('LISTEN')
                },
                nomatch: {
                    entry: say("Sorry, could you repeat the day?"),
                    on: { ENDSPEECH: "ask" }
                }
            }
        },
        whole_day: {
            initial: "prompt",
            on: {
                RECOGNISED: [
                    { target: 'meeting_created', cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {})  && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes'},
                    { target: 'time', cond: (context) =>  "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no' },
                
                    { target: ".nomatch" }],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Ok, meeting for ${context.title} on ${context.day}. Will it take the whole day?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry:send('LISTEN') 
                },
                nomatch: {
                    entry: say("Sorry I didn't understand. Will it take the whole day?"),
                    on: { ENDSPEECH: "ask" }
                }
            }
        },
        time: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "time" in (grammar[context.recResult[0].utterance] || {}),
                    actions: assign((context) => { return { time: grammar[context.recResult[0].utterance].time! } }),
                    target: "confirmation_with_time"
                },
                    { target: ".nomatch" }],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Ok. What time is your meeting?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry:send('LISTEN') 
                },
                nomatch: {
                    entry: say("Sorry could you repeat the time?"),
                    on: { ENDSPEECH: "ask" }
                }
            }
        },
        confirmation_whole_day: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                     target: 'meeting_created', 
                     cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes' },
                     { target: 'time', 
                     cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no'},
                    { target: ".nomatch" }],
                TIMEOUT:'.prompt'
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want me to create a meeting titled ${context.title} on ${context.day} for the whole day?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry:send('LISTEN')
                },
                nomatch: {
                    entry: say("Sorry I didn't understand."),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        confirmation_with_time: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                     target: 'meeting_created', 
                     cond: (context) =>"yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'yes'},
                     { target: 'meeting', 
                     cond: (context) => "yes_no" in (yes_nogrammar[context.recResult[0].utterance] || {}) && yes_nogrammar[context.recResult[0].utterance].yes_no === 'no'},
                    { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want me to create a meeting titled ${context.title} on ${context.day} at ${context.time}?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry:send('LISTEN')
                },
                nomatch: {
                    entry: say("Sorry I didn't understand."),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        meeting_created: {
            initial: "prompt",
            states: {
                prompt: { entry: say("Ok.Your meeting has been created!") }
            }
        },
}})
    
    


