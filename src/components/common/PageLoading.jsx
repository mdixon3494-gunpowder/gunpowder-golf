function PageLoading({ message = 'Loading...', showSkeleton = false, skeletonCount = 3 }) {
  if (showSkeleton) {
    return (
      <div className="page-loading-skeleton">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    )
  }

  return (
    <div className="page-loading">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  )
}

export default PageLoading
