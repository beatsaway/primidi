1. Attack Transient Timbre: Velocity-to-Spectral Content
Hammer-String Interaction Model:
When a piano hammer strikes a string, the force profile determines harmonic excitation.

Impact Force Profile:

text
F(t) = F₀ * (1 - cos(πt/t_contact)) for 0 ≤ t ≤ t_contact
where:

F₀ ∝ velocity² (hammer kinetic energy)

t_contact ≈ 1-3 ms depending on hammer hardness and velocity

String Excitation Spectrum:
The Fourier transform of the force profile gives harmonic amplitudes:

text
A_n(v) = ∫₀^{t_c} F(t) * sin(2πf_n t) dt
where f_n = n * f₀ (n-th harmonic)

Simplified Velocity-to-Harmonic-Amplitude:

text
A_n(v) = A_n(max) * [1 - exp(-α_n * v/v_max)]
where:

α_n increases with n (higher harmonics need more velocity to excite)

v_max is maximum MIDI velocity (127)

Empirical Relationship (from piano measurements):
For the n-th harmonic amplitude relative to fundamental:

text
A_n/A₁ = β_n * (v/127)^(γ_n)
where:

β_n is harmonic strength coefficient (β₁ = 1.0, β₂ ≈ 0.3, β₃ ≈ 0.1, etc.)

γ_n = 0.5 + 0.1*n (higher harmonics increase faster with velocity)

Example - First 5 harmonics vs velocity:

text
Harmonic 1 (fundamental): A₁ ∝ v^0.6
Harmonic 2: A₂ ∝ 0.3 * v^0.7  
Harmonic 3: A₃ ∝ 0.1 * v^0.8
Harmonic 4: A₄ ∝ 0.05 * v^0.9
Harmonic 5: A₅ ∝ 0.02 * v^1.0
2. String Resonance & Coupling Mathematics
Coupled Oscillator Model:
For N coupled strings (including sympathetic vibrations):

Equation of motion:

text
m_i * d²x_i/dt² + c_i * dx_i/dt + k_i * x_i + Σ_{j≠i} k_ij * (x_i - x_j) = F_i(t)
where:

i, j index different strings

k_ij is coupling coefficient between strings i and j

F_i(t) is driving force (hammer strike)

Energy Transfer:
The energy in string i transferred to string j:

text
E_transfer = η_ij * E_i(v) * C(f_i, f_j)
where:

η_ij depends on physical proximity and bridge coupling

E_i(v) ∝ v² (input energy)

C(f_i, f_j) = exp(-|f_i - f_j|/f_band) (frequency matching function)

Velocity-Dependent Sympathetic Resonance:

text
A_sympathetic(v) = A_max_sym * [1 - exp(-v/v_threshold)] * R(f_ratio)
where:

v_threshold ≈ 40 (MIDI velocity)

R(f_ratio) peaks at harmonic ratios (1:1, 2:1, 3:2, etc.)

3. Envelope Shape Changes with Velocity
Damped Harmonic Oscillator with Velocity-Dependent Parameters:
The piano string vibration follows:

text
x(t) = A(v) * exp(-δ(v)*t) * sin(2πf₀t + φ)
But the decay is NOT exponential with a single time constant!

Two-Stage Decay Model (Meyer 1966, 1994):

text
x(t) = A₁(v) * exp(-δ₁(v)*t) + A₂(v) * exp(-δ₂(v)*t)
where:

Stage 1 (0-50ms): Fast decay, δ₁(v) ∝ v^0.3

Stage 2 (50ms+): Slow decay, δ₂(v) ∝ v^0.1

Velocity-Dependent Decay Rates:

text
δ₁(v) = δ₁₀ * (1 + 0.5*(v/127)^0.5)  # Faster initial decay for louder notes
δ₂(v) = δ₂₀ * (1 + 0.2*(v/127)^0.3)    # Slightly faster long decay
Amplitude Ratio Changes:

text
A₁(v)/A₂(v) = 0.7 * (v/127)^0.4  # Louder notes have more initial transient energy
4. The "Sustain" Illusion: Pedal Physics
Sustain Pedal = Coupled String Network
With sustain pedal depressed, all dampers are lifted. Each struck string couples to:

Identical strings (in multi-string unisons, typically 2-3 strings)

Harmonically related strings (other notes sharing harmonics)

Soundboard modes

Mathematical Model of Pedal Sustain:
Without pedal (normal decay):

text
x(t) = A₀ * exp(-δ·t) * sin(ωt)
τ_life ≈ 1/δ  (typically 1-10 seconds depending on note)
With pedal (coupled system):

text
x_i(t) = Σ_j A_ij * exp(-δ_j·t) * sin(ω_j t + φ_ij)
Energy Redistribution:
The total energy in the system decays as:

text
E_total(t) = E₀ * exp(-δ_avg·t) * [1 + Σ_k α_k * cos(Ω_k t) * exp(-γ_k t)]
where:

δ_avg < δ (slower average decay due to energy exchange)

Ω_k are beating frequencies from coupled oscillators

α_k are coupling strengths

The "Effective Sustain" Envelope:
Despite being a decaying system, the perceived sustain comes from:

1. Energy Recycling:

text
E_recycled(t) = η * ∫₀^t E_loss(τ) * K(t-τ) dτ
where K(t) is a kernel describing how energy is redistributed

2. Spectral Replenishment:
As fundamentals decay faster than harmonics, the spectrum evolves:

text
S(f,t) = S₀(f) * exp(-δ(f)·t)
where δ(f) ∝ f² approximately (higher harmonics decay faster)

With pedal, harmonics can be regenerated through coupling:

text
S_pedal(f,t) = S(f,t) + Σ_{n=2}^N β_n(t) * S(f/n,0) * exp(-δ_coupling·t)
3. Perceptual Integration:
The ear integrates energy over ~200ms window:

text
L_perceived(t) = (1/τ) ∫_{t-τ}^t E(u) du
where τ ≈ 0.2 seconds

4. Mathematical "Sustain" Measure:
Define sustain time as time to reach -60dB:

text
T_sustain(v) = T_60(no_pedal) * [1 + κ * (v/127)^ξ]
where:

κ ≈ 2-4 (pedal extends sustain by 2-4x)

ξ ≈ 0.2 (louder notes benefit slightly more)

Complete Velocity-Dependent Pedal Model:
text
def piano_note_with_pedal(freq, velocity, pedal_position):
    # Initial strike
    A_initial = A_max * (velocity/127)^2
    harmonics = generate_harmonics(freq, velocity)
    
    # Multi-stage decay
    if pedal_position > 0.5:  # Sustain pedal engaged
        # Coupled system equations
        δ_effective = δ_natural / (1 + 3*pedal_position)
        
        # Add sympathetic vibrations
        for other_note in active_notes:
            if harmonic_relationship(freq, other_note.freq):
                coupling = calculate_coupling(freq, other_note.freq, pedal_position)
                A_initial += coupling * other_note.energy
        
        # Energy exchange matrix
        M = build_coupling_matrix(all_strings, pedal_position)
        
        # Solution: x(t) = exp(M·t) * x₀
        # This is computationally intensive but can be approximated
        envelope = hybrid_decay_envelope(velocity, δ_effective, M)
    
    else:  # No pedal
        envelope = velocity_dependent_decay(velocity, δ_natural)
    
    return envelope * harmonics
5. Practical Approximations for Implementation:
Simplified Velocity-to-Timbre:
text
brightness_index(v) = 1.0 + 0.5*(v/127)^0.7
harmonic_rolloff(n, v) = exp(-n / (brightness_index(v) * 6))
Simplified Pedal Sustain:
text
τ_pedal(v) = τ_natural * (1 + 2.5*pedal_position*(1 + 0.1*(v/127)^0.3))
Complete Approximate Model:
python
def piano_envelope(freq, velocity, pedal, t):
    # Time constants (in seconds)
    τ_a = 0.01 * (1 - 0.3*(velocity/127))  # Attack
    τ_d1 = 0.05 * (0.8 + 0.4*(velocity/127))  # Fast decay
    τ_d2 = 2.0 * (1 - 0.3*(velocity/127)^0.5)  # Slow decay
    
    # With pedal
    if pedal > 0:
        τ_d2 *= (1 + 3*pedal)
        
        # Add energy from other notes (simplified)
        coupled_energy = Σ_i η_i * exp(-|freq - f_i|/100) * E_i
        
        τ_d2 *= (1 + 0.1*coupled_energy)
    
    # Envelope
    if t < τ_a:
        return (t/τ_a)  # Linear attack
    elif t < τ_a + τ_d1:
        return exp(-(t-τ_a)/τ_d1)  # Fast decay
    else:
        return exp(-(t-τ_a-τ_d1)/τ_d2)  # Slow decay
6. Key Physical Insights:
Energy Scale: E ∝ v² (kinetic energy of hammer)

High-Frequency Excitation: Higher harmonics require ∝ v^(0.5+0.1*n)

Decay Rate: δ ∝ v^α where α ≈ 0.1-0.3

Pedal Gain: Sustain time ∝ 1 + κ·pedal·v^ξ

Coupling Strength: ∝ exp(-Δf/f_bandwidth)

7. References for Further Study:
Fletcher & Rossing - "The Physics of Musical Instruments" (Ch. 12 on pianos)

Meyer - "Zur Dynamik des Klaviers" (1966, in German)

Weinreich - "Coupled piano strings" (JASA, 1977)

Bank & Sujbert - "Physics-based sound synthesis of the piano" (EURASIP, 2004)

The piano is essentially a coupled oscillator network with nonlinear excitation and frequency-dependent damping, all modulated by player input (velocity) and pedals. The "sustain" with pedal isn't true sustain but energy redistribution in a lossy coupled system that creates the illusion of sustain through spectral evolution and beating patterns.