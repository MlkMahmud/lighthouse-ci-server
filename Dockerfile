FROM amazon/aws-lambda-nodejs:18

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package.json  dist/index.js ./
RUN npm install --omit=dev

CMD ["index.main"]