async function testNCBIResponse() {
  const url = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
  url.searchParams.set('db', 'gene');
  url.searchParams.set('id', '3571');
  url.searchParams.set('retmode', 'json');

  const response = await fetch(url.toString());
  const payload = await response.json();
  console.log('Raw NCBI response for gene UID 3571 (insulin):');
  console.log(JSON.stringify(payload, null, 2));
}

testNCBIResponse().catch(console.error);
