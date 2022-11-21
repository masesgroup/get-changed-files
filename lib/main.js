"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const github_2 = require("@actions/github");
function run() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Create GitHub client with the API token.
            const client = (0, github_1.getOctokit)(core.getInput('token', { required: true }));
            const format = core.getInput('format', { required: true });
            // Ensure that the format parameter is set properly.
            if (format !== 'space-delimited' && format !== 'csv' && format !== 'json') {
                core.setFailed(`Format must be one of 'string-delimited', 'csv', or 'json', got '${format}'.`);
            }
            // Debug log the payload.
            core.debug(`Payload keys: ${Object.keys(github_2.context.payload)}`);
            // Get event name.
            const eventName = github_2.context.eventName;
            // Define the base and head commits to be extracted from the payload.
            let base;
            let head;
            let basehead;
            switch (eventName) {
                case 'pull_request':
                    base = (_b = (_a = github_2.context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.base) === null || _b === void 0 ? void 0 : _b.sha;
                    head = (_d = (_c = github_2.context.payload.pull_request) === null || _c === void 0 ? void 0 : _c.head) === null || _d === void 0 ? void 0 : _d.sha;
                    basehead = base + '...' + head;
                    break;
                case 'push':
                    base = github_2.context.payload.before;
                    head = github_2.context.payload.after;
                    basehead = base + '...' + head;
                    break;
                default:
                    core.setFailed(`This action only supports pull requests and pushes, ${github_2.context.eventName} events are not supported. ` +
                        "Please submit an issue on this action's GitHub repo if you believe this in correct.");
            }
            // Log the base and head commits
            core.info(`Base commit: ${base}`);
            core.info(`Head commit: ${head}`);
            // Ensure that the base and head properties are set on the payload.
            if (!base || !head) {
                core.setFailed(`The base and head commits are missing from the payload for this ${github_2.context.eventName} event. ` +
                    "Please submit an issue on this action's GitHub repo.");
                // To satisfy TypeScript, even though this is unreachable.
                base = '';
                head = '';
            }
            // Use GitHub's compare two commits API.
            // https://developer.github.com/v3/repos/commits/#compare-two-commits
            //    const response = await client.repo.compareCommits({
            //      base,
            //      head,
            //      owner: context.repo.owner,
            //      repo: context.repo.repo
            //    })
            const response = yield client.request('GET /repos/{owner}/{repo}/compare/{basehead}{?page,per_page}', {
                owner: github_2.context.repo.owner,
                repo: github_2.context.repo.repo,
                basehead: basehead
            });
            // Ensure that the request was successful.
            if (response.status !== 200) {
                core.setFailed(`The GitHub API for comparing the base and head commits for this ${github_2.context.eventName} event returned ${response.status}, expected 200. ` +
                    "Please submit an issue on this action's GitHub repo.");
            }
            // Ensure that the head commit is ahead of the base commit.
            if (response.data.status !== 'ahead') {
                core.setFailed(`The head commit for this ${github_2.context.eventName} event is not ahead of the base commit. ` +
                    "Please submit an issue on this action's GitHub repo.");
            }
            // Get the changed files from the response payload.
            const files = response.data.files;
            const all = [], added = [], modified = [], removed = [], renamed = [], addedModified = [];
            for (const file of files) {
                const filename = file.filename;
                // If we're using the 'space-delimited' format and any of the filenames have a space in them,
                // then fail the step.
                if (format === 'space-delimited' && filename.includes(' ')) {
                    core.setFailed(`One of your files includes a space. Consider using a different output format or removing spaces from your filenames. ` +
                        "Please submit an issue on this action's GitHub repo.");
                }
                all.push(filename);
                switch (file.status) {
                    case 'added':
                        added.push(filename);
                        addedModified.push(filename);
                        break;
                    case 'modified':
                        modified.push(filename);
                        addedModified.push(filename);
                        break;
                    case 'removed':
                        removed.push(filename);
                        break;
                    case 'renamed':
                        renamed.push(filename);
                        break;
                    default:
                        core.setFailed(`One of your files includes an unsupported file status '${file.status}', expected 'added', 'modified', 'removed', or 'renamed'.`);
                }
            }
            // Format the arrays of changed files.
            let allFormatted, addedFormatted, modifiedFormatted, removedFormatted, renamedFormatted, addedModifiedFormatted;
            switch (format) {
                case 'space-delimited':
                    // If any of the filenames have a space in them, then fail the step.
                    for (const file of all) {
                        if (file.includes(' '))
                            core.setFailed(`One of your files includes a space. Consider using a different output format or removing spaces from your filenames.`);
                    }
                    allFormatted = all.join(' ');
                    addedFormatted = added.join(' ');
                    modifiedFormatted = modified.join(' ');
                    removedFormatted = removed.join(' ');
                    renamedFormatted = renamed.join(' ');
                    addedModifiedFormatted = addedModified.join(' ');
                    break;
                case 'csv':
                    allFormatted = all.join(',');
                    addedFormatted = added.join(',');
                    modifiedFormatted = modified.join(',');
                    removedFormatted = removed.join(',');
                    renamedFormatted = renamed.join(',');
                    addedModifiedFormatted = addedModified.join(',');
                    break;
                case 'json':
                    allFormatted = JSON.stringify(all);
                    addedFormatted = JSON.stringify(added);
                    modifiedFormatted = JSON.stringify(modified);
                    removedFormatted = JSON.stringify(removed);
                    renamedFormatted = JSON.stringify(renamed);
                    addedModifiedFormatted = JSON.stringify(addedModified);
                    break;
            }
            // Log the output values.
            core.info(`All: ${allFormatted}`);
            core.info(`Added: ${addedFormatted}`);
            core.info(`Modified: ${modifiedFormatted}`);
            core.info(`Removed: ${removedFormatted}`);
            core.info(`Renamed: ${renamedFormatted}`);
            core.info(`Added or modified: ${addedModifiedFormatted}`);
            // Set step output context.
            core.setOutput('all', allFormatted);
            core.setOutput('added', addedFormatted);
            core.setOutput('modified', modifiedFormatted);
            core.setOutput('removed', removedFormatted);
            core.setOutput('renamed', renamedFormatted);
            core.setOutput('added_modified', addedModifiedFormatted);
            // For backwards-compatibility
            core.setOutput('deleted', removedFormatted);
        }
        catch (error) {
            let message = 'Unknown Error';
            if (error instanceof Error)
                message = error.message;
            core.setFailed(message);
        }
    });
}
run();
