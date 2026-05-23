# CourtListener Connector Capabilities

What this connector can do for you.

## Citation verification

- Confirm a legal citation resolves to a real case (e.g., "255 P.3d 1083").
- Resolve every citation in a block of text at once.
- Get the matched case name, court, date, and parallel citations for each cite.

## Case-law research

- Search opinions by full text or case name.
- Filter by court (for example, the Colorado Supreme Court).

## Reading opinions

- Fetch a case's metadata (case name, citations, court, date, related opinions).
- Fetch the full text of an opinion to check holdings and pinpoint language.

## Limitations

- Read-only. This connector does not file, edit, or submit anything.
- Coverage is broad (federal and state) but not guaranteed complete for every cite; an empty match means recheck the citation, not that the case does not exist.
- The citation-lookup endpoint is rate limited; batch multiple cites into one request when possible.
- A free account is required.
