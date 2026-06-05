## Bioweave

#### Gene DB Agent
Resolves a user-supplied gene name or symbol into a structured gene record and produces the UID lists that downstream agents (Protein, PubMed) consume. This is the entry point for every graph in BioWeave — nothing else runs until Gene DB succeeds.

Inputs and outputs
Identifies genes of interest from a  natural language user input. Returns a normalized gene record and two UID lists — one for linked proteins, one for linked papers.
The gene record must include: official symbol, full name, organism, chromosome location, description, aliases, and the source Gene UID.

Internal steps
Identify genes of interest from input
Call esearch with the raw string to get candidate Gene UIDs
If multiple UIDs are returned, surface them to the user for disambiguation and do not silently pick the first result
Call esummary with the confirmed UID to fetch the full gene record
Call elink to retrieve linked protein UIDs and linked PubMed UIDs
Return the gene record and both UID lists as a single normalized response


Boundaries
This agent does not fetch protein details or paper metadata. It produces UID lists and hands them off. It does not decide how those UIDs are rendered or prioritized — that is the graph layer's responsibility.

Error handling expectations

Unknown gene name: return a clear not-found signal, do not return an empty record
Ambiguous name (multiple UIDs): return the candidate list for the user to resolve
NCBI rate limit hit: surface the error and defer to the cache layer before retrying
Missing fields in esummary response: return the record with nulls, do not drop the record entirely


Caching
Results are keyed by Gene UID, not by the original search string. The cache lives outside this agent — Gene DB calls it but does not own it.