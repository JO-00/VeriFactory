FROM python:3.12-slim

WORKDIR /workspace

RUN pip install --no-cache-dir \
    ecdsa \
    PyYAML \
    pydantic

CMD ["python", "-m", "Simulation.Workflow.Init.generator"]
