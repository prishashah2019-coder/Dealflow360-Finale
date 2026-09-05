// steps = [{ key, label, state }] where state is 'done' | 'current' | 'pending' | 'rejected'
export default function StepTracker({ steps }) {
  return (
    <div className="step-tracker">
      {steps.map((step) => (
        <div className={`step ${step.state}`} key={step.key}>
          <div className="dot">
            {step.state === 'done' ? '✓' : step.state === 'rejected' ? '✕' : ''}
          </div>
          <div className="label">{step.label}</div>
        </div>
      ))}
    </div>
  )
}
