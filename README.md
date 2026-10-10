# VEILPROOF
<p align="center">
  <strong>An India-focused whistleblower reporting and evidence workflow.</strong><br />
  Help evidence reach an accountable investigation while reducing unnecessary exposure of its source.
</p>

<p align="center">
  <a href="#watch-and-explore">Watch &amp; explore</a> ·
  <a href="#how-veilproof-works">How it works</a> ·
  <a href="#product-screenshots">Screenshots</a> ·
  <a href="#technical-direction">Technical direction</a>
</p>

> [!IMPORTANT]
> The available materials describe a prototype and a proposed architecture. Screenshots and demonstrations should use fictional evidence. Do not use this README or a UI preview as proof that evidence protection, anonymity, access control, or blockchain verification has been implemented and security-tested.

## Watch and explore

The three deployment links are reserved for the actual application. Replace each token when its URL is ready.

| Experience | Link to add | What it shows |
| --- | --- | --- |
| **Demo video** | [Demo link](https://drive.google.com/file/d/16366t3i8XIcaDrgfEXCer1FOkdE3iZ8X/view?usp=drive_link) | A short walkthrough of the reporter and investigation journeys |
| **Frontend on Vercel** | [Vercel link](https://veilproof.vercel.app) | The VeilProof application |
| **Backend on Render** | [Render link](https://dashboard.render.com/project/prj-db4ppaqjnfac7383miog) | The API base URL or a safe health endpoint |
| **Interactive story pitch** | [Explore the VeilProof story](https://veilproof-evidence-story.woodsywood5.chatgpt.site/) | A separate, illustrative five-minute presentation |

> The story pitch illustrates the concept. It does not submit a real report or grant access to real evidence.

## Why VeilProof?

A whistleblower may have records that matter to the public, yet those same records can reveal who found them. A document author field, a face in a photograph, a voice in a recording, or a file’s location history can expose a source before an investigation even begins.

VeilProof brings the reporter’s protection choices, the investigation workflow, and evidence integrity into one coherent journey. It is designed around three principles:

| Protect the person | Preserve the evidence | Account for access |
| :--- | :--- | :--- |
| The reporter reviews possible identity clues and chooses what to protect. | An unchanged original is kept separately from a protected investigator copy. | Routine review uses the protected copy; an original requires a specific, independently reviewed, time-limited request. |

## How VeilProof works

```mermaid
flowchart LR
    A["Reporter describes a concern<br/>and adds evidence"] --> B["Review possible identity clues<br/>Choose what to protect"]
    B --> C["Keep two separate versions<br/>Sealed original + protected copy"]
    C --> D["Privacy reviews the copy<br/>and assigns an investigator"]
    D --> E["Investigator reviews<br/>protected evidence"]
    E --> F{"Original needed?"}
    F -->|No| I["Record findings<br/>and safe progress updates"]
    F -->|Yes| G["Privacy review<br/>then independent Oversight decision"]
    G -->|Approved| H["Specific file<br/>time-limited, audited access"]
    G -->|Denied| E
    H --> I
    C --> J["Private tracking receipt<br/>and integrity commitment"]

    classDef action fill:#f7eee2,stroke:#bf5232,color:#242722;
    classDef control fill:#e4eee6,stroke:#4e6c5b,color:#203c30;
    class A,B,C,J action;
    class D,E,G,H,I control;
```

**The reporter journey:** Start without a required identity account, describe the concern, review evidence, confirm protection choices, receive a case reference and separate tracking secret, and return for limited status updates.

**The staff journey:** A Privacy & Evidence Officer reviews protected material and assigns an investigator. The investigator works from the released copy. Access to an original is exceptional: a distinct Privacy reviewer makes the first decision, then a distinct Oversight reviewer makes the final decision. The first decision alone never opens the original.

**The integrity receipt:** The proposed design anchors only an opaque commitment to a blockchain. Actual evidence, the complaint narrative, identity clues, tracking credentials, and keys stay off-chain. A commitment can help detect later changes; it cannot establish whether an allegation is true.

## Product screenshots

<img width="1691" height="924" alt="Screenshot 2026-10-10 093911" src="https://github.com/user-attachments/assets/f3a766da-371e-47b5-bad9-4b55b7acc5bc" />
<img width="1687" height="809" alt="Screenshot 2026-10-10 094006" src="https://github.com/user-attachments/assets/17a24e86-654e-4419-a214-3e3ad9f6ada4" />
<img width="1340" height="769" alt="Screenshot 2026-10-10 094027" src="https://github.com/user-attachments/assets/bc044804-fc3b-4ab7-9797-8aa013ec98ef" />
<img width="1235" height="814" alt="Screenshot 2026-10-10 094056" src="https://github.com/user-attachments/assets/edaf5d73-1168-4c7b-b7e9-7fc47b234dd7" />
<img width="1082" height="618" alt="Screenshot 2026-10-10 094111" src="https://github.com/user-attachments/assets/b64ebd3c-c412-4e08-beb0-ee3b5f4c2433" />
<img width="1023" height="597" alt="Screenshot 2026-10-10 094122" src="https://github.com/user-attachments/assets/96024876-7693-4e86-92b7-a0a35a3d1876" />



## Technical direction

The project documents propose the following stack. Treat this as an architecture target until the application repository and deployments are checked.

| Layer | Proposed technology | Responsibility |
| --- | --- | --- |
| Reporter and staff application | React Native, Expo web, TypeScript | Guided reporting, identity review, role-specific workspaces |
| Application API | FastAPI | Intake, authorization, case workflow, tracking, audit |
| Case records | PostgreSQL, with Supabase considered | Durable workflow state and restricted views |
| Evidence storage | Private object storage | Separately encrypted originals and protected copies |
| Processing and key access | Isolated workers and a separate key-use boundary | Format-specific protection, verification, controlled decryption |
| Integrity proof | Solidity, Hardhat, Polygon Amoy, relayer | Opaque commitments and verifiable receipts; no reporter wallet required |
| Hosting | Vercel frontend, Render backend | Deployment targets; URLs to be added above |

File metadata removal and visible-content protection require different processing for PDFs, images, audio, and video. An unsupported format must never be presented as fully protected.

## Development setup

The imported application source is not included in this documentation workspace, so installation commands cannot be verified here. Once this README is placed in the application repository, fill in its actual paths and commands before telling contributors to run them:

```text
Frontend directory:  frontend
Install command:     npm ci
Start command:       npm run dev -- --host 0.0.0.0 --port 8443

Backend directory:   backend
Install command:     pip install -r requirements.txt
Start command:       python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

Root directory:      backend
Build command:       pip install -r requirements.txt gunicorn uvicorn[standard]
Start command:       gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120

Root directory:      frontend
Install command:     npm ci
Build command:       npm run build
Output directory:    dist
```

Keep the backend’s service credentials, encryption keys, signing keys, and tracking-secret verifier out of frontend bundles and repository history. Add an `.env.example` containing **names only** when the actual configuration is finalized.

## Project documents

- [Product requirements](VeilProof_PRD_v1.0.md) — user journeys, feature scope, and acceptance criteria.
- [Technical architecture](VeilProof_Technical_Architecture_v1.0.md) — proposed services, storage, processing, and proof design.
- [Security and access](VeilProof_Security_and_Access_v1.0.md) — roles, key boundaries, original access, and audit requirements.
- [Development plan and Antigravity prompts](VeilProof_Hackathon_Development_and_Antigravity_Prompts.md) — phased hackathon implementation guide.
- [Detailed process flow](VeilProof_Process_Flow.md) — reporter, staff, access, and proof paths.

## Team

**Jee Jee Brats** · VeilProof

This project is being developed as a hackathon concept. The current documentation and illustrative pitch do not establish production readiness or authorization to accept real whistleblower evidence.
