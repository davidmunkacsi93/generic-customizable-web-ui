import SwaggerParser from "swagger-parser";
import { FORM, INPUT, DROP_DOWN, SWITCH } from "../types/layout-item-types";
import {
  HTTP_POST,
  HTTP_DELETE,
  HTTP_PUT,
  HTTP_GET
} from "../types/http-methods";

class ApiIntegrationService {
  async integrateNewAPI(url) {
    return SwaggerParser.validate(url)
      .then(async () => {
        let parsedSpecification = await SwaggerParser.parse(url);
        if (parsedSpecification.swagger === "2.0") {
          return this.processOpenApi2(parsedSpecification);
        } else if (parsedSpecification.openapi === "3.0.0") {
          return this.processOpenApi3(parsedSpecification);
        } else {
          console.error("Unknown specification or version detected.");
        }
      })
      .catch(reason => {
        console.error(reason);
      });
  }

  processOpenApi2(specification) {
    var version = {
      specificationVersion: specification.swagger
    };
    var metadata = this.extractMetadata(specification.info);
    var serverMetadata = this.extractServerMetadataV2(specification);
    var apiModels = this.createApiModelsFromSchemaObjects(
      specification.definitions
    );
    var dynamicComponents = this.createDynamicComponentsForApi(
      version.specificationVersion,
      specification.paths,
      apiModels.apiModels
    );

    var apiUIModel = {
      ...version,
      ...metadata,
      ...serverMetadata,
      ...apiModels,
      ...dynamicComponents,
      apiLayout: []
    };

    return apiUIModel;
  }

  processOpenApi3(specification) {
    var version = {
      specificationVersion: specification.openapi
    };
    var metadata = this.extractMetadata(specification.info);
    var serverMetadata = this.extractServerMetadataV3(specification.servers);
    var apiModels = this.createApiModelsFromSchemaObjects(
      specification.components.schemas
    );
    var dynamicComponents = this.createDynamicComponentsForApi(
      version.specificationVersion,
      specification.paths,
      apiModels.apiModels
    );

    var apiUIModel = {
      ...version,
      ...serverMetadata,
      ...metadata,
      ...apiModels,
      ...dynamicComponents,
      apiLayout: []
    };

    return apiUIModel;
  }

  extractMetadata(info) {
    return {
      apiVersion: info.version,
      title: info.title,
      description: info.description
    };
  }

  extractServerMetadataV2(specification) {
    const scheme = specification.schemes[0];
    return {
      serverURL: scheme + "://" + specification.host + specification.basePath
    };
  }

  extractServerMetadataV3(servers) {
    return {
      serverDescription: servers[0].description,
      serverURL: servers[0].url
    };
  }

  createApiModelsFromSchemaObjects(schemaObjects) {
    var result = {
      apiModels: []
    };
    if (!schemaObjects) return;

    for (var objectKey in schemaObjects) {
      const schemaObject = schemaObjects[objectKey];

      if (!schemaObject) continue;

      var apiModel = {
        type: objectKey,
        description: schemaObject.description,
        properties: []
      };

      for (var propertyName in schemaObject.properties) {
        var propertyObject = schemaObject.properties[propertyName];
        if (!propertyObject) continue;

        var property = {
          name: propertyName,
          type: propertyObject.type,
          format: propertyObject.format,
          placeholder: propertyObject.example,
          isEnum: false
        };

        if (propertyObject.enum) {
          property.isEnum = true;
          property.enumValues = propertyObject.enum;
        }

        if (propertyObject.type === "array") {
          if (propertyObject.items.$ref) {
            property.arrayType = propertyObject.items.$ref.replace(
              "#/components/schemas/",
              ""
            );
          } else {
            property.arrayType = propertyObject.items.type;
          }
        }
        apiModel.properties.push(property);
      }
      result.apiModels.push(apiModel);
    }
    return result;
  }

  createDynamicComponentsForApi(apiVersion, apiEndpoints, apiModels) {
    var result = {
      dynamicComponents: []
    };
    for (var endpoint in apiEndpoints) {
      var apiEndpoint = apiEndpoints[endpoint];
      for (var httpMethod in apiEndpoint) {
        var apiMethod = apiEndpoint[httpMethod];

        var dynamicComponent = this.getNewDynamicComponent();
        dynamicComponent.path = endpoint;

        if (apiVersion === "2.0") {
          dynamicComponent.description = apiMethod.summary;
        } else if (apiVersion === "3.0.0") {
          dynamicComponent.description = apiMethod.description;
        }

        if (httpMethod === "get") {
          // Based on the parameters specified generate a search form,
          // that transform into a grid / list / input based on the response type.
          dynamicComponent.httpMethod = HTTP_GET;
        } else if (httpMethod === "post") {
          dynamicComponent.httpMethod = HTTP_POST;
          dynamicComponent.type = FORM;

          if (apiMethod.parameters) {
            debugger;
            dynamicComponent.controls = this.createControlsForParameters(
              apiMethod,
              apiModels
            );
          } else if (apiMethod.requestBody) {
            dynamicComponent.controls = this.createControlsForSchema(
              apiMethod,
              apiModels
            );
          } else {
            console.error(
              `Can't generate dynamic component for endpoint ${endpoint}`
            );
          }
          // Generate dynamic form.
        } else if (httpMethod === "delete") {
          // Generate dynamic form.
          dynamicComponent.httpMethod = HTTP_DELETE;
        } else if (httpMethod === "put") {
          // Generate dynamic form for the parameters.
          dynamicComponent.httpMethod = HTTP_PUT;
        } else {
          console.log(httpMethod);
          console.error("Not supported HTTP method.");
        }

        result.dynamicComponents.push(dynamicComponent);
      }
    }
    return result;
  }

  createControlsForSchema(apiMethod, apiModels) {
    var result = [];
    var schema = apiMethod.requestBody.content["application/json"].schema;
    var apiModelKey = schema.$ref.replace("#/components/schemas/", "");
    var apiModelForSchema = this.getApiModelByType(apiModels, apiModelKey);
    for (var property of apiModelForSchema.properties) {
      var control = {
        label: property.name,
        element: INPUT,
        in: property.in,
        type: property.type,
        format: property.format,
        placeholder: property.example,
        isEnum: false
      };
      result.push(control);
    }
    return result;
  }

  createControlsForParameters(apiMethod) {
    var result = [];
    debugger;
    for (var parameter of apiMethod.parameters) {
      var control = {
        label: parameter.name,
        element: INPUT,
        in: parameter.in,
        type: parameter.schema.type,
        format: parameter.schema.format,
        placeholder: parameter.schema.example,
        value: null
      };

      if (parameter.schema.enum) {
        if (
          parameter.schema.enum.every(
            value => value === true || value === false
          )
        ) {
          control.element = SWITCH;
        } else {
          control.element = DROP_DOWN;
          control.values = parameter.schema.enum;
        }
      }
      result.push(control);
    }
    return result;
  }

  getNewDynamicComponent() {
    return {
      description: null,
      httpMethod: null,
      path: null,
      type: null,
      controls: []
    };
  }

  getApiModelByType(apiModels, modelType) {
    return apiModels.find(model => model.type === modelType);
  }
}

const instance = new ApiIntegrationService();
Object.freeze(instance);

export default instance;
