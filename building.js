/**
 * Building
 **/
/* ----- Private ----- */
var Connector = require('connector'),
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
        console.log('Turn: ' + (this.turn ++));

        if (data) {
            if (data.token) {
                this.token = data.token;
            }
            else if (data.status === 'error') {
                console.log('Error: ' + data.message);
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
    
    handleEnding: function(data) {
        this.state = State.DONE;
        this.score = data.score;
        this.nextState();
    },
    
    handleInProgress: function(data) {
        var i;

        if (data.status === 'finished') {
            this.handleEnding(data);
            return;
        }
        
        this.elevators = data.elevators;
        this.requests = data.requests;

        for (i = 0; i < this.elevators.length; ++i) {
            this.elevators[i].id = '' + i;
        }

        this.all = _.clone(this.elevators);
        
        this.commands = {};
        
        this.setDropoff();
        this.setPickup();
        this.setHandle();
        
        this.submit({ "token": this.token, "commands": this.commands });
    },
    
    setHandle: function() {
        var i, elevator, command, found = false;
        
        for (i = 0; i < this.elevators.length; ++i) {
            elevator = this.elevators[i];
            command = this.getHandleCommand(elevator);
            if (command) {
                elevator.isBusy = true;
                this.commands[elevator.id] = command;
                found = true;
                break;
            }
        }

        if (found) {
            this.elevators.splice(i, 1);
        }
    },
    
    getHandleCommand: function(elevator) {
        if (elevator.buttons_pressed && elevator.buttons_pressed.length) {
            // Get closest floor
            var closest = _.min(elevator.buttons_pressed, function(floor) { return Math.abs(elevator.floor - floor); });
            return this.getGoToFloorCommand(closest, 1, elevator);
        }
        
        return null;
    },
    
    setDropoff: function() {
        var i, command, request, elevator, found;
            
        for (i = 0; i < this.elevators.length; ++i) {
            elevator = this.elevators[i];
            command = this.getDropoffCommand(elevator);
            if (command) {
                elevator.isBusy = true;
                this.commands[elevator.id] = command;
                found = true;
                break;
            }
        }

        if (found) {
            this.elevators.splice(i, 1);
        }
    },
    
    getDropoffCommand: function(elevator) {
        var i;
        
        if (elevator.buttons_pressed && elevator.buttons_pressed.length) {
            for (i = 0; i < elevator.buttons_pressed.length; ++i) {
                if (elevator.floor === elevator.buttons_pressed[i]) {
                    return {
                        direction: 1, speed: 0
                    };
                }
            }
        }
    },
    
    setPickup: function() {
        var i, j, command, request, elevator, found;
            
        if (this.requests && this.requests.length) {
            for (i = 0; i < this.requests.length; ++i) {
                request = this.requests[i];
                this.sortAllByRequestedFloor(request.floor);
                for (j = 0; j < this.all.length; ++j) {
                    elevator = this.all[j];
                    command = this.getPickupCommand(request, elevator);
                    if (command) {
                        request.isServed = true;
                        elevator.isBusy = true;
                        elevator.isVeryBusy = true;
                        this.commands[elevator.id] = command;
                        found = true;
                        break;
                    }
                }

                if (request.isServed) {
                    this.all.splice(j, 1);
                }
            }
        }
    },

    sortAllByRequestedFloor: function(floor) {
        this.all = _.sortBy(this.all, function(elevator) {
            return Math.abs(elevator.floor - floor);
        });
    },

    sortElevatorByRequestedFloor: function(floor) {
        this.elevators = _.sortBy(this.elevators, function(elevator) {
            return Math.abs(elevator.floor - floor);
        });
    },
    
    getPickupCommand: function(req, elevator) {
        if (elevator.isBusy) {
            if (req.floor === elevator.floor && req.direction === this.commands[elevator.id].direction) {
                return {
                    direction: req.direction,
                    speed: 0
                };
            }

            return null;
        }
        
        if (!elevator.buttons_pressed || elevator.buttons_pressed.length === 0) {
            return this.getGoToRequestCommand(req, elevator);
        }
        
        return null;
    },
    
    getGoToRequestCommand: function(req, elevator) {
        return this.getGoToFloorCommand(req.floor, req.direction, elevator);
    },
    
    getGoToFloorCommand: function(floor, direction, elevator) {
        if (floor > elevator.floor) {
            return {
                direction: 1, speed: 1
            };
        }
        else if (floor < elevator.floor) {
            return {
                direction: -1, speed: 1
            };
        }
        else {
            return {
                direction: direction, speed: 0
            };
        }
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
