'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetApp = document.querySelector('#reset');
const deleteApp = document.querySelector('#delete');



// global variables
let map, mapEvent
//Parent Class
class Workout {

    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        // this.date = date;
        // this.id = id;
        this.coords = coords; // [lat / lng]
        this.distance = distance; // in mi
        this.duration = duration; // in min
       

    }

    _setDescription(){
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // to generate the description(date) on the header of the pop-up
    // type is defined in the child class
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}` 
    }

    // Each time this method will increase the number of clicks
    click(){
        this.clicks++;
    }
}


// Child Class
class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        // inheritance from parent class
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // in min/mi
        this.pace = this.duration / this.distance;
        return this.pace;

    }
}



// Child Class
class Cycling extends Workout {
    type = 'cycling'; // similar to this.type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        // inheritance from parent class
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // mi / hr
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// const run1 = new Running ([22, 10], 4.2, 42, 200);
// const cycling1 = new Cycling ([12, -4], 2.2, 12, 130);
// console.log(run1, cycling1);

/////////////// APPLICATION ARCHITECTURE ///////////

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];
    #methods = ['this._renderWorkout()'];
    

    constructor() {
        // Get user's position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        resetApp.onclick = function(){
            app.reset();
        }
        deleteApp.onclick = function(){
            app.delete();
        }
        
        
    }
   

    _getPosition() {
        // if geolocation exist
        if (navigator.geolocation)
            // this will get you the current co-ordinates of your location
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                // if there is an error
                alert('could not get your position')
            });
    }

    _loadMap(position) {
        // creating a variable for lattitude and longitude
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

        const coords = [latitude, longitude];

        // setting the co-ordinate to the map variable
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);


        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // (.on) similar to the event listener --> once you click the map, the co-ordinates will be displayed 
        this.#map.on('click', this._showForm.bind(this));
         // For each workout render into the map
         this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        })
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        // the form on the left side will be displayed
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        // Empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
         
    }
       
    
    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        // helper functions to check the conditions of the numbers from the data
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat,lng} = this.#mapEvent.latlng;
        let workout;



        // If activity running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            
            // Check if data is valid
            if (
                // !Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
            )
                
                return alert('Inputs have to be positive numbers!');
                
                // new running object is created and it's pushed to an qorkout array
                workout = new Running([lat, lng], distance, duration, cadence);
               
        }

        // If activity cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            
            // Check if data is valid
            if(!validInputs(distance, duration, elevation) || !allPositive(distance, duration))

            return alert('Inputs have to be positive numbers!');
            
            // new cycling object is created 
            workout = new Cycling([lat, lng], distance, duration, elevation);
        
        }

        // Add new object to workout array
        this.#workouts.push(workout);
        // console.log(workout);

        // Render workout on a map as marker
        this._renderWorkoutMarker(workout)

        // REnder workout on list
        this._renderWorkout(workout)
        
        //Hide form + clear input fields;
        this._hideForm()

        // Set local storage to all workouts
        this._setLocalStorage();
        



    }
    _renderWorkoutMarker(workout){
    // show the form
    // .popup is used to add properties to the popup bar.
    // to bind methods 'this' should be returned
        
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minwidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            // setup the text of the pop up
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' :'🚴‍♀️'} ${workout.description}`)
            .openPopup();

    }

    _renderWorkout(workout){
    // html template for running
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}
        </h2>
       
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' :'🚴‍♀️'} </span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">mi</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        `; 
        

        if(workout.type  === 'running')
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/mi</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        
        </li>
        `;
     // html template for cycling
        if(workout.type  === 'cycling')
        html += `  <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">mi/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">ft</span>
      </div>
   
      
    </li>
    `;
    
   
    // insert the form as sibling element at the end of the form
    form.insertAdjacentHTML('afterend', html);

   
    }

    _moveToPopup(e){
        // (.closest) --> this will display the entire element whever the click happens in the workout container.
        const workoutEl = e.target.closest('.workout');
        // console.log(workoutEl);

        if(!workoutEl) return;
        
        // (.find) ---> it will find the workout with the same id once it's clicked 
        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        // console.log(workout);

        // (.setView) --> this will display the co-ordinates of the workout once it's clicked 
        this.#map.setView(workout.coords, this.#mapZoomLevel,{
            animate: true,
            pan:{
                duration: 1,
            }
        });

        // Using the public interface
        // workout.click();
    }
    
    _setLocalStorage(){
        // local storage is API that brower provides
        // Key, Value store
        // JSON.stringify() --> to convert item into string
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
       
    }
    _getLocalStorage(){
        // JSON.parse --> converts stings into data set
        // Objects coming from local storage will not inherit all the methods
        const data = JSON.parse(localStorage.getItem('workouts'));
        console.log(data);

        if(!data) return;
        
        // restore the workouts array by using the data from local storage
        this.#workouts = data;

        // For each workout render the workout
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        
        })

    }
    
    
    reset(){
        // remove all items from the local storage
        localStorage.removeItem('workouts');
        // location is  abig object that containds methods and properties
        location.reload();
    }

    delete(){
        // remove current item
        this.#workouts.pop();
        this._setLocalStorage();
        location.reload();
        console.log(this.#workouts);
    }

   
    
   
   
    

}


const app = new App();



















// 