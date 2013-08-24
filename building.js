/**
 * Building
 **/
/* ----- Private ----- */
var Connector = require('./connector'),
    _ = require('underscore'),
    State = {
        INIT: 0,
        STARTED: 1,
        INPROGRESS: 2,
        DONE: 3
    };

/**
 * Building
 * @constructor
 */
var Building = {
    token: null,
    url: 'http://boxlift.org/v1/buildings',
    state: State.INIT,
    elevators: null,
    requests: null,
    turn: 0,
    nextState: function(data) {
        if (data) {
            if (data.token) {
                this.token = data.token;
            }
            else if (data.status === 'error') {
                console.log('FATAL ' + data.message);
                return;
            }
        }
        
        if (this.state === State.INIT) {
            this.handleInit();
        }
        else if (this.state === State.STARTED) {
            this.handleStarted(data);
        }
        else if (this.state === State.INPROGRESS) {
            this.handleInProgress(data);
        }
        else if (this.state === State.DONE) {
            this.handleDone();
        }
    },
    
    handleDone: function() {
        console.log('Done! Score: ' + this.score);
    },
    
    submit: function(data) {
        var me = this;
        Connector.post(this.url, data, function(data) { me.nextState(data); });
    },
    
    handleInit: function() {
        // Get initial token & URL
        this.state = State.STARTED;
        this.submit({ "username": "wong", "plan": "training_1" });
    },
    
    handleStarted: function(data) {
        this.url = data.building;
        
        this.state = State.INPROGRESS;
        this.submit({ "token": this.token, "commands": {} });
    },
    
    setEnding: function(data) {
        this.state = State.DONE;
        this.score = data.score;

        this.nextState();
    },
    
    handleInProgress: function(data) {
        var i;

        // Goes to ending state if status is finished.
        if (data.status === 'finished') {
            this.setEnding(data);
            return;
        }
        
        // Prepare data for consumption
        this.commands = {};
        this.elevators = data.elevators;
        this.requests = data.requests;
        for (i = 0; i < this.elevators.length; ++i) {
            this.elevators[i].id = '' + i;
        }
        
        // Processing logic

        this.submit({ "token": this.token, "commands": this.commands });
    },

    

    /**
     * Starts simulation
     *
     * @returns {void}
     */
    start: function() {
        this.nextState();
    }
};

/* ----- Static ----- */
/**
 * Creates a Building
 * 
 * @static
 * @param {string} data Data from BoxLift. This is still expected to be in STRING
 * @returns {Building}
 */
exports.create = function() {
    var building = Object.create(Building);
    return building;
};
