# Sloy UI variables for Figma

The optional development importer uses the same independently authored graph as the runtime: `src/tokens/figma-modes.json`. Run `npm run tokens`, then import `figma/importer/manifest.json` through Figma's development plugins.

It creates Sloy UI collections for Primitives, Theme, Semantic surfaces and Borders. Theme and surface modes inherit independently. The maximum number of modes in one collection is four. On error the importer rolls back only collections created during that run; duplicate Sloy collections are rejected.

Importing into an existing prototype library requires an explicit migration plan for variable IDs; the tool does not silently rename old collections. Generation and mock tests do not imply that a live Figma file has been updated.

For hover layers, use reaction/base plus reaction/hover-opacity or reaction/pressed-opacity. Figma COLOR alpha cannot alias a FLOAT variable; CSS computes that alpha from the same numeric primitives.
