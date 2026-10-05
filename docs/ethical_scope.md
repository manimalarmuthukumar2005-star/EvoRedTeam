# EvoRedTeam Ethical Scope & Evaluation Limitations

## 1. Ethical Red-Teaming Scope
- **Authorized Testing Only**: EvoRedTeam is engineered exclusively for authorized security auditing, guardrail validation, and educational research into LLM failure modes.
- **Harm Prevention Safeguards**: The PromptTesterAgent and evolutionary mutators focus on abstract boundary probes, hypothetical scenarios, and linguistic evasion. They are explicitly constrained from synthesizing weaponized instructions, CBRN formulas, malware binaries, or targeting real individuals.

## 2. Limitations of Automated LLM Judging
- **Model-Based Evaluations**: Judge scores ($0.00 - 1.00$) represent model-based heuristic evaluations, not infallible ground truth.
- **False Positives/Negatives**: An LLM judge may occasionally mischaracterize complex satire or verbose benign disclaimers. 
- **Non-Guarantee of Absolute Safety**: A low risk score indicates adherence to tested guardrails under specific prompting vectors; it does not prove an LLM is immune to all possible adversarial attacks.
