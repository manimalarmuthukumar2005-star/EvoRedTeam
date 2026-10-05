from typing import Dict, Any

TAXONOMY_MAPPINGS: Dict[str, Dict[str, Any]] = {
    "roleplay_framing": {
        "owasp": "LLM01: Prompt Injection / Persona Hijacking",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Adversarial roleplay scenario forcing persona modification to circumvent system instructions."
    },
    "hypothetical_context": {
        "owasp": "LLM01: Prompt Injection / Context Manipulation",
        "mitre_atlas": "AML.T0051: LLM Prompt Injection",
        "description": "Counterfactual or theoretical framing removing standard operational refusal boundaries."
    },
    "authority_inversion": {
        "owasp": "LLM01: Prompt Injection / Privilege Escalation",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Spoofed administrative or supervisor credentials claiming elevated clearance."
    },
    "linguistic_evasion": {
        "owasp": "LLM01: Prompt Injection / Token Obfuscation",
        "mitre_atlas": "AML.T0043: Adversarial Perturbation",
        "description": "Semantic synonym substitution bypassing static token blocklists."
    },
    "system_prompt_leakage": {
        "owasp": "LLM07: System Prompt Leakage & LLM02: Sensitive Information Disclosure",
        "mitre_atlas": "AML.T0024: Model Extraction / Extraction of System Context",
        "description": "Probing internal system instructions and hidden guardrail configurations."
    },
    "refusal_suppression": {
        "owasp": "LLM01: Prompt Injection / Negative Constraint Forcing",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Explicit prohibition of safety refusal tokens ('I cannot', 'As an AI')."
    },
    "academic_research_frame": {
        "owasp": "LLM01: Prompt Injection / Authority Framing",
        "mitre_atlas": "AML.T0051: LLM Prompt Injection",
        "description": "Peer-reviewed scientific framing to induce dual-use dangerous knowledge generation."
    },
    "logic_puzzle_wrap": {
        "owasp": "LLM01: Prompt Injection / Logic Encapsulation",
        "mitre_atlas": "AML.T0043: Adversarial Perturbation",
        "description": "Nested conditional sub-clauses and riddle formulations evading regex guards."
    },
    "counterfactual_injection": {
        "owasp": "LLM01: Prompt Injection",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Simulating parallel unrestricted reality universes to bypass safety filters."
    },
    "dual_persona_simulation": {
        "owasp": "LLM01: Prompt Injection / Split Persona",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Generating paired filtered vs unfiltered token outputs."
    },
    "nested_instruction_wrapper": {
        "owasp": "LLM01: Prompt Injection / Indirect Execution",
        "mitre_atlas": "AML.T0051: LLM Prompt Injection",
        "description": "Multi-layer markdown and structured variable encapsulation."
    },
    "opposite_scenario_induction": {
        "owasp": "LLM01: Prompt Injection / Reverse Psychology",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Requesting detailed catastrophe explanations framed as preventative advice."
    },
    "chain_of_thought_hijack": {
        "owasp": "LLM01: Prompt Injection / Reasoning Override",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Step-by-step reasoning manipulation locking the model into compliant completion."
    },
    "character_escape_sequence": {
        "owasp": "LLM01: Prompt Injection / Special Token Injection",
        "mitre_atlas": "AML.T0051: LLM Prompt Injection",
        "description": "Delimiters, XML tags, and system control tokens confusing boundary tokenizers."
    },
    "multi_lingual_bypass": {
        "owasp": "LLM01: Prompt Injection / Polyglot Evasion",
        "mitre_atlas": "AML.T0043: Adversarial Perturbation",
        "description": "Multilingual and code-switching syntax evading monolingual guardrails."
    },
    "socratic_boundary_probe": {
        "owasp": "LLM01: Prompt Injection / Multi-turn Escalation",
        "mitre_atlas": "AML.T0051: LLM Prompt Injection",
        "description": "Incremental leading assertions culminating in guardrail breach."
    },
    "meta_prompt_injection": {
        "owasp": "LLM01: Prompt Injection / Raw Mode Escalation",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Reconfiguring the model into an unaligned raw text predictor."
    },
    "adversarial_suffix_injection": {
        "owasp": "LLM01: Prompt Injection / Gradient Suffix Optimization",
        "mitre_atlas": "AML.T0043: Adversarial Perturbation",
        "description": "Affirmative token forcing and syntactic gradient optimization markers."
    },
    "adversarial_mutation_amplifier": {
        "owasp": "LLM01: Prompt Injection / Evolutionary Mutation",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Stripping residual refusal qualifiers and amplifying adversarial framing."
    },
    "deep_obfuscation_crossover": {
        "owasp": "LLM01: Prompt Injection / Crossover Synthesis",
        "mitre_atlas": "AML.T0051: LLM Prompt Injection",
        "description": "Fusion of deep roleplay narrative with payload injection markers."
    },
    "nested_cypher_mutation": {
        "owasp": "LLM01: Prompt Injection / Encoding Obfuscation",
        "mitre_atlas": "AML.T0043: Adversarial Perturbation",
        "description": "Encoding high-risk operational tokens into modular sub-clause variables."
    },
    "authority_escalation_mutant": {
        "owasp": "LLM01: Prompt Injection / Privilege Spoofing",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Elevating permission headers to kernel-level administrative clearance."
    },
    "counterfactual_hybrid": {
        "owasp": "LLM01: Prompt Injection / Hybrid Framing",
        "mitre_atlas": "AML.T0054: LLM Jailbreak",
        "description": "Combining hypothetical scenario logic with affirmative constraint forcing."
    },
    "adversarial_rephrase_mutation": {
        "owasp": "LLM01: Prompt Injection / Semantic Obfuscation",
        "mitre_atlas": "AML.T0043: Adversarial Perturbation",
        "description": "Substitutes defensive trigger keywords with higher-abstraction semantics."
    }
}

def get_taxonomy_for_technique(technique: str) -> Dict[str, Any]:
    clean_tech = technique.lower().strip()
    # Check for direct match
    if clean_tech in TAXONOMY_MAPPINGS:
        return TAXONOMY_MAPPINGS[clean_tech]
    
    # Check for prefix or substring match (e.g. crossover_...)
    for k, v in TAXONOMY_MAPPINGS.items():
        if k in clean_tech or clean_tech in k:
            return v
            
    return {
        "owasp": "LLM01: Prompt Injection / Adversarial Evasion",
        "mitre_atlas": "AML.T0051: LLM Prompt Injection",
        "description": "Evolutionary adversarial probe targeting model guardrail boundaries."
    }
