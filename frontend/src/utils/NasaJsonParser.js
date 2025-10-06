// Helper function to convert AU to millions of km
function auToMillionKm(au) {
    return au * 149.5978707; // 1 AU ≈ 149.5978707 million km
}

// Helper function to convert Julian Date (TDB) to approximate days since J2000.0 (JD 2451545.0 TDB)
function jdToDaysSinceJ2000(jd) {
    return parseFloat(jd) - 2451545.0;
}

// Function to convert NASA/JPL small-body orbital elements JSON to Orbit class parameters
export function createOrbitFromJPLData(jsonData) {
    // Parse the input JSON string or object
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    // Extract and convert parameters with correct formula
    const eccentricity = parseFloat(data.e);
    const q_au = parseFloat(data.q_au_1); // perihelion distance in AU
    const semiMajorAxis_au = q_au / (1 - eccentricity); // Correct formula: a = q / (1 - e)
    const semiMajorAxis = auToMillionKm(semiMajorAxis_au); // in millions of km

    const inclination = parseFloat(data.i_deg) * (Math.PI / 180); // to radians

    const omega = parseFloat(data.w_deg) * (Math.PI / 180); // to radians

    const raan = parseFloat(data.node_deg) * (Math.PI / 180); // to radians

    const period_days = parseFloat(data.p_yr) * 365.256363; // approximate sidereal year in days

    const tau = jdToDaysSinceJ2000(parseFloat(data.tp_tdb)) * 86400; // convert to seconds since J2000.0

    // Default numPoints (can be overridden if provided)
    const numPoints = data.numPoints || 80;

    // Return object compatible with Orbit constructor
    return {
        semiMajorAxis,
        eccentricity,
        inclination,
        omega,
        raan,
        period: period_days,
        tau,
        numPoints,
        name: data.object_name || data.object || 'Unknown'
    };
}


// Function to parse a file with multiple JSON objects
function parseOrbitFile(data) {
    console.log('Starting to parse orbit file data');
    try {
        // Handle the data from require() or fetch()
        let jsonData = data;

        // If data is a module with default export (from require)
        if (data && data.default) {
            jsonData = data.default;
        }

        // If data is a string, parse it
        if (typeof data === 'string') {
            jsonData = JSON.parse(data);
        }

        // Ensure we have an array
        if (!Array.isArray(jsonData)) {
            console.error('Expected array of asteroid data, got:', typeof jsonData);
            return [];
        }

        // Convert each asteroid object to orbit parameters
        const orbitParamsArray = jsonData.map((asteroidData, index) => {
            try {
                const orbitParams = createOrbitFromJPLData(asteroidData);
                //console.log(`Parsed asteroid ${index + 1}/${jsonData.length}: ${orbitParams.name}`);
                return orbitParams;
            } catch (error) {
                console.error(`Error parsing asteroid at index ${index}:`, error, asteroidData);
                return null;
            }
        }).filter(orbit => orbit !== null); // Remove failed parses

        console.log(`Successfully parsed ${orbitParamsArray.length} asteroid orbits`);
        return orbitParamsArray;

    } catch (error) {
        console.error('Error in parseOrbitFile:', error.message);
        return [];
    }
}

export { parseOrbitFile };
