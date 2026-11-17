export function publicCompetitionLabel(value){
  return String(value??'')
    .replace(/P(?:i|o)ntos Corridos\s+(\d{4})\/([12])/gi,'PC/$2 $1')
    .replace(/P(?:i|o)ntos Corridos\/?([12])\s+(\d{4})/gi,'PC/$1 $2')
    .replace(/P(?:i|o)ntos Corridos\s+(\d{4})/gi,'PC $1')
    .replace(/P(?:i|o)ntos Corridos\/?([12])/gi,'PC/$1')
    .replace(/P(?:i|o)ntos Corridos/gi,'PC');
}
