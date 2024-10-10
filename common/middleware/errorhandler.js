
export default (error, request, reply) => {
  console.error('An error occurred:', error);

  const response = {
    message: 'Internal Server Error',
    details:  error.message,
  };

  if (error.isGraphQLError) {
    reply.status(500).send({
      errors: error.errors.map(err => ({
        message: err.message,
        locations: err.locations,
        path: err.path,
      })),
    });
  } else {
    reply.status(500).send(response);
  }
};
  