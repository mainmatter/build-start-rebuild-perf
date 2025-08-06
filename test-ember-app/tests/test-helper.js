import { setApplication } from "@ember/test-helpers";
import { setupEmberOnerrorValidation, start } from "ember-qunit";
import { loadTests } from "ember-qunit/test-loader";
import * as QUnit from "qunit";
import { setup } from "qunit-dom";
import Application from "test-ember-app/app";
import config from "test-ember-app/config/environment";

setApplication(Application.create(config.APP));

setup(QUnit.assert);
setupEmberOnerrorValidation();
loadTests();
start();
