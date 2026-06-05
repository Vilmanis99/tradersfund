export default function Loading() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: '1.25rem' }} />
      <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: 16, width: '65%', marginBottom: '2.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: '0.75rem' }} />
            <div className="skeleton" style={{ height: 22, width: '85%', marginBottom: '0.5rem' }} />
            <div className="skeleton" style={{ height: 22, width: '60%', marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: 12, width: '40%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
