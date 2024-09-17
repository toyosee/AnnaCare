let trainingData; // Global variable to hold training data
let isModelTrained = false; // Flag to check if the model is trained

// Set the backend to WebGL for better performance
ml5.setBackend("webgl");

// Show loader and hide form initially
document.getElementById('loader').style.display = 'block';

// Initialize the neural network
const nn = ml5.neuralNetwork({
    task: 'classification',
    debug: false // Set to true for more detailed logs during development
});

// Load training data from JSON file
fetch('data/training-data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    })
    .then(data => {
        trainingData = data;

        // Log the loaded training data
        console.log("Loaded training data:", trainingData);

        // Use forEach to add data to the neural network
        data.forEach(dataEntry => {
            const input = {
                fever: dataEntry.Fever === "Yes" ? 1 : 0,
                cough: dataEntry.Cough === "Yes" ? 1 : 0,
                fatigue: dataEntry.Fatigue === "Yes" ? 1 : 0,
                difficulty_breathing: dataEntry["Difficulty Breathing"] === "Yes" ? 1 : 0,
                age: Number(dataEntry.Age) || 0, // Default to 0 if NaN
                gender: dataEntry.Gender === "Female" ? 0 : 1, // Female = 0, Male = 1
                blood_pressure: dataEntry["Blood Pressure"] === "High" ? 1 : (dataEntry["Blood Pressure"] === "Low" ? -1 : 0),
                cholesterol_level: dataEntry["Cholesterol Level"] === "High" ? 1 : (dataEntry["Cholesterol Level"] === "Low" ? -1 : 0),
                outcome: dataEntry["Outcome Variable"] === "Positive" ? 1 : 0 // Include outcome variable
            };

            // Use 'label' for consistency
            const output = { label: dataEntry.Disease };

            nn.addData(input, output);
        });

        nn.normalizeData();

        // Train the model
        nn.train({ epochs: 64, batchSize: 16, earlyStopping: true }, () => {
            console.log('Model trained successfully');
            isModelTrained = true; // Set the model trained flag to true
            console.log("Training phase completed");

            // Hide loader and show form
            document.getElementById('loader').style.display = 'none'; // Hide loader
            document.getElementById('medical-form').style.display = 'block'; // Show the form
            document.getElementById('notification-board').style.display = 'block'
        });
    })
    .catch(error => {
        console.error("Error loading training data:", error);
        
        // Hide loader in case of an error
        document.getElementById('loader').style.display = 'none';
    });

// Handling form submission for prediction
document.getElementById('medical-form').addEventListener('submit', (event) => {
    event.preventDefault();

    // Ensure the model is trained before making a prediction
    if (!isModelTrained) {
        console.error("Model is not trained yet. Please wait for the training to complete.");
        return;
    }

    // Get form values
    const fever = document.querySelector('input[name="fever"]:checked')?.value === '1' ? 1 : 0;
    const cough = document.querySelector('input[name="cough"]:checked')?.value === '1' ? 1 : 0;
    const fatigue = document.querySelector('input[name="fatigue"]:checked')?.value === '1' ? 1 : 0;
    const difficulty_breathing = document.querySelector('input[name="difficulty_breathing"]:checked')?.value === '1' ? 1 : 0;
    const age = Number(document.getElementById('age').value) || 0; // Default to 0 if NaN
    const gender = document.getElementById('gender').value === '1' ? 1 : 0; // Male = 1, Female = 0
    const blood_pressure = document.getElementById('blood_pressure').value === '1' ? 1 : (document.getElementById('blood_pressure').value === '-1' ? -1 : 0);
    const cholesterol_level = document.getElementById('cholesterol_level').value === '1' ? 1 : (document.getElementById('cholesterol_level').value === '-1' ? -1 : 0);
    
    // Get the outcome variable from user input (1 for Positive, 0 for Negative)
    const outcome = document.querySelector('input[name="outcome"]:checked')?.value === 'Positive' ? 1 : 0;

    // Prepare input for the model
    const input = {
        fever,
        cough,
        fatigue,
        difficulty_breathing,
        age,
        gender,
        blood_pressure,
        cholesterol_level,
        outcome // Include outcome variable in prediction
    };

    // Log input values for debugging
    console.log("Input for classification:", input);

    // Classify the input
    nn.classify(input, (results, err) => {
        if (err) {
            console.error("Prediction error:", err);
            return;
        }
        
        // Log raw classification results
        console.log("Raw classification results:", results);
        
        // Check if results are valid
        if (!results || !Array.isArray(results) || results.length === 0) {
            console.error("No valid results returned from classification. Check model and input.");
            return;
        }

        // Get predicted disease and confidence
        const predictedResult = results[0]; // Best prediction

        // Check for undefined label or confidence
        if (!predictedResult || typeof predictedResult.label === 'undefined' || typeof predictedResult.confidence === 'undefined') {
            console.error("Predicted result is undefined or invalid.");
            return;
        }

        const predictedDisease = predictedResult.label || "Unknown";
        const confidence = predictedResult.confidence * 100; // Convert to percentage

        // Log predicted disease and confidence
        console.log("Predicted Disease:", predictedDisease);
        console.log("Confidence:", confidence.toFixed(2) + "%");

        // Display the prediction result
        document.getElementById('prediction-result').innerHTML = `
            Diagnosis: ${predictedDisease} <br/>
            <button id="load-doctor-note" class="btn btn-secondary mt-3">Add Doctor's Note</button> <br/>
        `;
        //Certainty: ${confidence.toFixed(2)}%
        // Show the button and set up the doctor's note section
    document.getElementById('doctor-note-section').style.display = 'none'; // Hide initially
    document.getElementById('predicted-disease').value = predictedDisease; // Set predicted disease for the note form

    // Add event listener for the button to show doctor's note form
    document.getElementById('load-doctor-note').addEventListener('click', () => {
        document.getElementById('doctor-note-section').style.display = 'block'; // Show the doctor's note section
    });
    });
});

// Example of how to handle form submission and update notifications
document.addEventListener('DOMContentLoaded', function () {
    // Function to update notifications based on user input
    function updateNotifications() {
        // Clear previous notifications
        document.getElementById('notifications').innerHTML = '';

        // Collect findings based on input
        const findings = [];

        // Check fever input
        if (document.querySelector('input[name="fever"]:checked')) {
            if (document.querySelector('input[name="fever"]:checked').value === '1') {
                findings.push('Patient has fever.');
            }
        }

        // Check cough input
        if (document.querySelector('input[name="cough"]:checked')) {
            if (document.querySelector('input[name="cough"]:checked').value === '1') {
                findings.push('Patient has a cough.');
            }
        }

        // Check fatigue input
        if (document.querySelector('input[name="fatigue"]:checked')) {
            if (document.querySelector('input[name="fatigue"]:checked').value === '1') {
                findings.push('Patient is experiencing fatigue.');
            }
        }

        // Check difficulty breathing input
        if (document.querySelector('input[name="difficulty_breathing"]:checked')) {
            if (document.querySelector('input[name="difficulty_breathing"]:checked').value === '1') {
                findings.push('Patient has difficulty breathing.');
            }
        }

        // Blood Pressure findings
        const bloodPressure = document.getElementById('blood_pressure').value;
        if (bloodPressure === '1') {
            findings.push('Patient has high blood pressure.');
        } else if (bloodPressure === '-1') {
            findings.push('Patient has low blood pressure.');
        }

        // Cholesterol Level findings
        const cholesterolLevel = document.getElementById('cholesterol_level').value;
        if (cholesterolLevel === '1') {
            findings.push('Patient has high cholesterol.');
        } else if (cholesterolLevel === '-1') {
            findings.push('Patient has low cholesterol.');
        }

        // Add findings to notification board
        findings.forEach((finding,index) => {
            const notificationDiv = document.createElement('div');
            notificationDiv.className = 'notification';
            notificationDiv.innerText = `- ${finding}`;
            document.getElementById('notifications').appendChild(notificationDiv);
            //console.log(index)
        });
        // console.log(findings.length)
        document.getElementById("findings").innerText = `(${findings.length})`
    }

    // Add event listeners to form inputs
    const formInputs = document.querySelectorAll('#medical-form input, #medical-form select');
    formInputs.forEach(input => {
        input.addEventListener('change', updateNotifications);
    });

    // Initialize notifications when the page loads
    updateNotifications();
});

// Function to reset the form and notifications
function resetFormAndNotifications() {
    // Reset form fields
    document.getElementById('medical-form').reset();

    // Clear notifications
    document.getElementById('notifications').innerHTML = '';

    // Hide the doctor's note section
    document.getElementById('doctor-note-section').style.display = 'none';

    // Clear prediction result
    document.getElementById('prediction-result').innerHTML = '';
}

// Manage what happens when doctor submit remark
document.getElementById('doctor-note-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Call the function to gather and print the findings, remarks, and diagnosis
    sendToPrint();
});

function sendToPrint() {
    // Collect all findings from the notifications area
    const findings = [];
    document.querySelectorAll('#notifications .notification').forEach((notification) => {
        findings.push(notification.innerText);
    });

    // Get the diagnosed disease from the prediction result area
    const diagnosedDisease = document.getElementById('predicted-disease').value;

    // Get the doctor's remark from the form
    const doctorNote = document.getElementById('doctor-note').value;

    // Create a print content block
    let printContent = '<h2>Medical Findings</h2><ul>';
    findings.forEach(finding => {
        printContent += `<li>${finding}</li>`;
    });
    printContent += '</ul>';

    // Add diagnosed disease and doctor's remark to the print content
    printContent += `<h3>Diagnosed Disease: ${diagnosedDisease}</h3>`;
    printContent += `<h3>Doctor's Remarks</h3><p>${doctorNote}</p>`;

    // Open a new window for printing
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Medical Findings, Diagnosis, and Doctor\'s Remarks</title>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);  // Insert findings, diagnosis, and doctor's remark into the new window
    printWindow.document.write('</body></html>');

    // Trigger the print dialog
    printWindow.document.close();  // Close the document to complete writing
    printWindow.print();  // Initiate the print

    // Optional: Automatically close the print window after printing
    printWindow.onafterprint = function() {
        printWindow.close();
    };
}


// Add event listener for the reset button
document.getElementById('reset-button').addEventListener('click', resetFormAndNotifications);
