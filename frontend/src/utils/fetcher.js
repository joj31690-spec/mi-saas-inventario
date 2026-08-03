export const fetcher = async (url) => {
  const business = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
  
  if (business.id) {
    headers['X-Business-Id'] = business.id.toString();
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
};
