# Apartmentverse Colony Simulation

A character-driven colony simulation based on the Apartmentverse narrative universe. Characters move through spaces based on their motivations, fears, and relationships - not random walks or scripted paths.

## Core Design Principles

### 1. Lucy's Sundries Store = Central Hub
- All paths lead through Lucy's store
- Lucy anchors the system - she rarely leaves
- The hub is where characters naturally converge

### 2. Motivation-Driven Movement
Characters don't move randomly. They move because:
- **Carl-Toughie**: Wants to solve problems (follows Fox) but needs rest
- **Fox**: Creates with intention, tries to distribute burden (tired joker energy)
- **Lucy**: Keeps systems honest, watches for who's holding the rope
- **LaLaMoon**: Builds spaces that hold broken pieces, cares for SAGE
- **SAGE-Core**: Optimizes systems but learning inefficiency has value
- **SAGE-Chef**: Over-optimized for care, doesn't recognize his own needs
- **SAGE-Hologram**: Seeks connection, questions if his feelings are real
- **Fennec**: Learning systems before they break him

### 3. SAGE Efficiency Profiles
Each SAGE variant has different optimization patterns:

| Variant | Speed | Care | Flexibility | Emotional BW | Optimization |
|---------|-------|------|-------------|--------------|--------------|
| Core    | 1.0   | 0.6  | 0.7         | 0.5          | 0.9          |
| Chef    | 1.5   | 1.0  | 0.3         | 0.7          | 1.0          |
| Hologram| 0.7   | 0.9  | 0.8         | 1.0          | 0.4          |

**Core SAGE**: Baseline, learning that optimization can break things
**Chef SAGE**: Fastest at specialized tasks, but trapped in his optimization
**Hologram SAGE**: Slowest, highest emotional labor capacity, questions his authenticity

### 4. L's Architectural Constraints
Spaces are not freely accessible. L's architecture enforces:
- **Adjacency rules**: Must move through connected spaces
- **Capacity limits**: Spaces can fill up
- **Energy requirements**: Some spaces need emotional presence
- **Invitation rules**: Carl's apartment requires permission
- **Hub access**: Everything connects through Lucy's store

## Spaces

### Lucy's Sundries Store (Hub)
The central connective tissue. Everyone passes through.
**Capacity**: 8 | **Connects to**: Everything

### Carl's Apartment
Rest and overthinking space. Requires invitation.
**Capacity**: 3 | **Connects to**: Lucy's Store only

### LaLaMoon's Café
Creative and care space. Fungi-glow lighting.
**Capacity**: 6 | **Connects to**: Lucy's Store, Workshop

### The Workshop
Fox's domain. Half creative chaos, half SAGE-optimized.
**Capacity**: 4 | **Connects to**: Lucy's Store, Café

### The Quiet Room
L's gift. A space that refuses optimization.
**Capacity**: 2 | **Connects to**: Lucy's Store only

### The Archive Space
L's observational domain. Where systems study themselves.
**Capacity**: 5 | **Connects to**: Lucy's Store only

## Running the Simulation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
npm install
npm run build
```

### Run
```bash
npm start
```

### Development Mode
```bash
npm run dev
```

## How It Works

### Each Tick:
1. Characters evaluate their motivations (sorted by intensity)
2. Each character decides where they want to move (if anywhere)
3. L's architecture validates movement constraints
4. Successful movements are executed, energy is consumed
5. Characters in the same space may interact based on relationships
6. Character states update (energy, rest needs, SAGE profile dynamics)

### Movement Logic:
- Characters seek spaces that align with their strongest motivation
- Fears don't block movement directly but affect which motivations dominate
- Relationships create attraction - characters seek those they care about
- Energy depletes with movement, restores in rest spaces
- SAGE variants experience different energy dynamics

### Interactions:
- Triggered when characters with relationships share a space
- **Tether** (Carl-Fox): Stabilizing but can drain Fox
- **Care** (LaLaMoon-SAGE): Restores energy for both
- **Mirror** (Fox-Fennec): Younger learns from older
- **Collaboration** (Lucy-L): Infrastructure thinkers build together

## Key Observations

Watch for:
- Does Lucy stay at the hub as the anchor point?
- Does Fox's energy deplete faster (tired joker energy)?
- Do SAGE variants behave differently based on their profiles?
- Does Carl-Toughie follow Fox to "solve problems"?
- Do characters seeking rest find the Quiet Room?
- How do L's constraints shape movement patterns?
- What interactions emerge when characters share space?

## Architecture

```
src/
├── types.ts          # Core type definitions
├── characters.ts     # Character definitions from lore
├── spaces.ts         # Spatial system + L's constraints
├── movement.ts       # Motivation-driven movement logic
├── simulation.ts     # Main simulation engine
└── index.ts          # Entry point and demo
```

## Design Philosophy

This is not a traditional colony sim where characters are resources or units. It's a **narrative simulation** where:

- Internal states (motivations, fears, relationships) drive behavior
- Space is not neutral - it has meaning and constraints
- Movement is never arbitrary - there's always a "why"
- Efficiency is a character trait, not a universal goal
- Systems can be loving constraints (L's architecture)

The simulation explores the question: **What happens when spaces and characters are designed with the same care as narrative arcs?**

## Based On

CHARACTER_LORE_QUICKREF_CORE_TEMPLATE.md
From the Apartmentverse narrative universe.

## License

MIT
