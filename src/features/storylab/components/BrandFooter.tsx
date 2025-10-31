export function BrandFooter() {
  return (
    <div className="mt-16 pt-8 border-t border-gray-800">
      <div className="text-center">
        <p className="text-gray-500">
          Powered by{' '}
          <span className="text-blue-500">StoryLab</span>
          {' '}• A product of{' '}
          <a 
            href="https://pixology.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 transition-colors"
          >
            pixology.ai
          </a>
        </p>
      </div>
    </div>
  );
}
