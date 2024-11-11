// index.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, push, remove, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://leads-tracker-4c8e8-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const reference = ref(database, "jobs");

const saveBtn = document.getElementById("saveBtn");
const job = document.getElementById("job");
const time = document.getElementById("time");

// Track jobs already rendered and the total summary
const renderedJobs = new Map(); // Map to track job nodes
let totalHours = 0; // Track total hours across all jobs

// Save a job entry to Firebase with a timestamp
saveBtn.addEventListener("click", () => {
    const jobNumber = job.value;
    const timeSpent = parseFloat(time.value);
    const timestamp = Date.now();

    // Push new entry under the specific job number
    const jobRef = ref(database, `jobs/${jobNumber}/entries`);
    push(jobRef, { timeSpent, timestamp });

    // Save job number as part of the data
    set(ref(database, `jobs/${jobNumber}/jobNumber`), jobNumber);
});

// Listen for new, changed, or removed job entries
onChildAdded(reference, (snapshot) => renderJob(snapshot));
onChildChanged(reference, (snapshot) => renderJob(snapshot));
onChildRemoved(reference, (snapshot) => {
    const container = document.querySelector(".card-container");
    const card = renderedJobs.get(snapshot.key);
    if (card) {
        container.removeChild(card);
        renderedJobs.delete(snapshot.key);
    }
    updateTotalHours(); // Recalculate totals after removal
});

// Render or update a job entry
function renderJob(snapshot) {
    const data = snapshot.val();
    const jobId = snapshot.key;
    const container = document.querySelector(".card-container");

    // Calculate total time for this job
    let totalTime = 0;
    let entriesHTML = "";
    if (data.entries) {
        entriesHTML = Object.values(data.entries)
            .map(entry => {
                totalTime += entry.timeSpent;
                return `
                    <div class="divEntry">
                    <p>Time Entry: ${entry.timeSpent} hours</p>
                    <p>Timestamp: ${new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                `;
            })
            .join("");

        // Update total time in Firebase
        set(ref(database, `jobs/${jobId}/totalTime`), totalTime);
    }

    // Create or update the card content
    let card = renderedJobs.get(jobId);
    if (!card) {
        // Create a new card if it doesn't exist
        card = document.createElement("div");
        card.classList.add("card");
        card.addEventListener("dblclick", () => {
            const jobRef = ref(database, `jobs/${jobId}`);
            remove(jobRef); // Delete job entry from Firebase
        });
        container.appendChild(card);
        renderedJobs.set(jobId, card); // Track the card
    }

    // Update the card's inner HTML
    card.innerHTML = `
        <p class="jobNumberCard">Job#: ${data.jobNumber || jobId}</p>
        ${entriesHTML}
        <p class="totTimeP">Total Time: ${totalTime} hours</p>
    `;

    // Update total hours and earnings after rendering
    updateTotalHours();
}

// Update total hours and display in a summary card
function updateTotalHours() {
    let cumulativeTotalHours = 0;

    // Calculate cumulative total hours from all jobs
    renderedJobs.forEach((card, jobId) => {
        const totalTimeElement = card.querySelector('.totTimeP'); // Last <p> tag is Total Time
        const totalTimeText = totalTimeElement.textContent.match(/Total Time: (\d+(\.\d+)?) hours/);
        const jobTotalTime = totalTimeText ? parseFloat(totalTimeText[1]) : 0;
        cumulativeTotalHours += jobTotalTime;
    });

    // Calculate earnings based on total hours
    const tax = cumulativeTotalHours * 55 * 0.25;
    const gross = cumulativeTotalHours * 55
    const gst = cumulativeTotalHours * 55 *0.10
    const net = cumulativeTotalHours * 55 - tax - gst
    const subtotal = gross + gst
    const taxToTransfer = gst + tax

    // Render or update the summary card
    let summaryCard = document.querySelector(".summary-card");
    if (!summaryCard) {
        summaryCard = document.createElement("div");
        summaryCard.classList.add("summary-card");
        document.body.appendChild(summaryCard);
    }

    // Update summary card content
    summaryCard.innerHTML = `
        <h3>Total Summary</h3>
        <p>Total Hours: ${cumulativeTotalHours} hours</p>
        <p>Subtotal: ${subtotal} $</p>
        <p>Gross: ${gross} $</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>GST: ${gst} $</p>
        <p>Net: ${net} $</p>
        <p>Tax&GST: ${taxToTransfer} $</p>
        
    `;
}
