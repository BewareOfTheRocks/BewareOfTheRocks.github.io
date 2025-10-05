async function getPopulationDensity(lat, lng){
    const parser = new DOMParser();

    // Reverse geocode to get country code
    const rcUrl = `https://api-bdc.io/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;

    const rcResp = await fetch(rcUrl);
        
    if (!rcResp.ok) return "This";
    const rcJson = await rcResp.json();
    const countryCode = rcJson.countryCode;
    if (!countryCode) return "Tsunami";

    // World Bank API for population density (EN.POP.DNST)
    // Request JSON and get the most recent non-null value
    const wbUrl = `https://api.worldbank.org/v2/country/${encodeURIComponent(
      countryCode
    )}/indicator/EN.POP.DNST`;

    const wbResp = await fetch(wbUrl);
    
    const wbString = await wbResp.text();

    if (!wbResp.ok) return null;

    const xmlDoc = parser.parseFromString(wbString, "text/xml");
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parsing error:', parseError.textContent);
    } else {
      
      const docElement = xmlDoc.documentElement;

      let data = 0;

      for (const r of docElement.children) {
        if(r.children.item(4).innerHTML != 0){
          data = r.children.item(4).innerHTML;
          break;
        }
      }

      return data;
    }
    return null;
}



function getMeteorData(meteorDiameter, meteorUnits, meteorDesity, velocity, velocityUnit, angle, waterHeight, populationDensity) {
  /* Inputs
    Meteor Diameter em int, e o meteor Units em m, km, ft, miles
    Meteor Density from 1000 to 8000 kg/m3
    Velocity 
    Velocity Unit km/s or miles/s between 11km/s and 72km/s
    Impact Angle in degress
    WaterHeight if in solo = -1 else the height of water
    populationDesity 
    */
   /* 
    Returns :
      diametroCrateraTransiente in meters
      profundidadeCrateraTrasiente in meters
      energiaDoImpacto in joules
      energiaDoImpactoTNT in TNT
      energiaDoImpactoMTNT in MegatonsTNT
      diameterFireball in meters
      clothesBurn in meters
      thirdDegreeBurn in meters
      secondDegreeBurn in meters
      firstDegreeBurn in meters
      deaths in number of peoples
      feridos in number of peoples
    */

  let mUnits = -1
  if(meteorUnits === -1)
    return -1;
  if(meteorUnits === "km")
  {
    meteorDiameter *= 1000;
  }
  else if(meteorUnits === "ft")
  {
    meteorDiameter *= 0.3048;
  }
  else if(meteorUnits === "miles")
  {
    meteorDiameter *= 1.60934;
  }

  if(velocityUnit === 'km/s')
  {
    velocity *= 1000;
  }
  if(velocityUnit === 'miles/s')
  {
    velocity *= 160934; 
  }

  if(velocity > 72000)
    velocity = 72000;
  if(velocity < 11000)
    velocity = 11000;
  
  if(angle > 90)
    angle = 90;

  let soilDesity = 2500;

  if(waterHeight > -1){
    soilDesity = 1000;
  }

  let energiaDoImpacto = 1/12*Math.PI * meteorDesity * (meteorDiameter**3) * (velocity**2);
  let energiaDoImpactoTNT = parseInt(energiaDoImpacto / 4.184e9);
  let energiaDoImpactoMTNT = energiaDoImpactoTNT / 10e5;
  let diameterFireball = parseInt(0.002 * (energiaDoImpacto**(1/3)));

  let clothesBurn = parseInt(thermicRadiationToRadius(energiaDoImpacto/10000000, 1));
  let thirdDegreeBurn = parseInt(thermicRadiationToRadius(energiaDoImpacto/10000000, 0.42));
  let secondDegreeBurn = parseInt(thermicRadiationToRadius(energiaDoImpacto/10000000, 0.25));
  let firstDegreeBurn = parseInt(thermicRadiationToRadius(energiaDoImpacto/10000000, 0.13));

  let deaths = parseInt((clothesBurn)**2 * Math.PI * 0.5 * (populationDensity/1000000)) ;
  let feridos = parseInt((firstDegreeBurn)**2 * Math.PI * 0.5 * (populationDensity/1000000)) ;

  let diametroCrateraTransiente = parseInt(1.161 * ((meteorDesity/soilDesity)**(1/3) * (meteorDiameter**0.78) * (velocity**0.44) * (9.81 ** (-0.22)) * (Math.sin(angle * Math.PI / 180) ** (1/3))));
  let profundidadeCrateraTrasiente = parseInt(diametroCrateraTransiente / (8**(0.5)));

  let p = {diametroCrateraTransiente : diametroCrateraTransiente,  profundidadeCrateraTrasiente : profundidadeCrateraTrasiente, energiaDoImpacto : energiaDoImpacto, energiaDoImpactoTNT : energiaDoImpactoTNT, energiaDoImpactoMTNT : energiaDoImpactoMTNT, diameterFireball : diameterFireball, clothesBurn : clothesBurn, thirdDegreeBurn : thirdDegreeBurn, secondDegreeBurn : secondDegreeBurn, firstDegreeBurn : firstDegreeBurn, deaths : deaths, feridos : feridos};

  //console.log(diametroCrateraTransiente, profundidadeCrateraTrasiente, energiaDoImpacto, energiaDoImpactoTNT, energiaDoImpactoMTNT,diameterFireball, clothesBurn, thirdDegreeBurn, secondDegreeBurn, firstDegreeBurn, deaths, feridos);

  return p;
};

function thermicRadiationToRadius(impactEnergy, thermic) {
  let E = impactEnergy;
  let T = thermic; // in J/m2
  let K = 3 * 10**-3;
  return ((K * E)/(2*Math.PI*T))**(0.5);
}

function getTsunamiEffects(diametroCrateraTransente, waterHeight) {
  let A0 = Math.min(0.14 * diametroCrateraTransente, waterHeight);
  return A0;
}
